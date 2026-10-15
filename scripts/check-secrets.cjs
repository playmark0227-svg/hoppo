const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"(?:private_key|refresh_token|client_secret)"\s*:\s*"[^"\s]+/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/
];
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const file of files) {
  if (!fs.existsSync(file) || /\.(?:png|jpg|jpeg|gif|webp|ico|woff2?|ttf|pdf|docx|xlsx)$/.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (patterns.some(pattern => pattern.test(content))) findings.push(file);
}
if (findings.length) {
  console.error('Potential secret material found (values are never printed):', findings.join(', '));
  process.exitCode = 1;
} else console.log('Tracked source: no private keys, refresh tokens, channel secrets or GitHub tokens detected.');
