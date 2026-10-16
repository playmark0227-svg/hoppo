const fs = require('node:fs');
const { cloudAdmin, PROJECT, NUMBER } = require('./cloud-admin.cjs');
const checks = [];
const check = (name, passed) => checks.push({ name, passed: !!passed });
const endpoints = ['exchangeLineToken', 'linkLineAccount', 'ensureAccount', 'updateProfile', 'claimDaily',
  'beginQuiz', 'answerQuiz', 'submitQuiz', 'redeemEvent', 'setFollow', 'setBlock', 'sendMessage', 'markThreadRead', 'reportUser', 'deleteAccount', 'manageContent'];

async function main() {
  if (!process.argv.includes('--public-only')) {
    const request = await cloudAdmin();
    const services = await request(`https://firebaseappcheck.googleapis.com/v1/projects/${NUMBER}/services`);
    check('Firestore requires App Check', services.services?.some(service => service.name.endsWith('/firestore.googleapis.com') && service.enforcementMode === 'ENFORCED'));
    const auth = await request(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`);
    // Never output the full Auth config: it also contains password-hash signing material.
    check('Email enumeration protection', auth.emailPrivacyConfig?.enableImprovedEmailPrivacy === true);
    check('Password policy remains enforced', auth.passwordPolicyConfig?.passwordPolicyEnforcementState === 'ENFORCE');
    const { functions } = await request(`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/asia-northeast1/functions`);
    const runtime = `hoppo-runtime@${PROJECT}.iam.gserviceaccount.com`;
    check('Every API is active on the dedicated runtime', functions?.length >= endpoints.length && functions.every(fn => fn.state === 'ACTIVE' && fn.serviceConfig.serviceAccountEmail === runtime));
    const policy = await request(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`, { method: 'POST', body: {} });
    check('Build identity has no application-data or Auth-admin grants', !policy.bindings.some(binding =>
      ['roles/datastore.user', 'roles/firebaseauth.admin'].includes(binding.role) && binding.members.includes(`serviceAccount:${NUMBER}-compute@developer.gserviceaccount.com`)));
    check('Runtime has no project owner/editor, build or storage grants', !policy.bindings.some(binding =>
      /roles\/(owner|editor|firebaseauth\.admin|artifactregistry\.|storage\.|cloudbuild\.)/.test(binding.role) && binding.members.includes(`serviceAccount:${runtime}`)));
    const release = await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`);
    const rules = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
    check('Deployed Firestore rules match the tested source', rules.source?.files?.some(file => file.content.trim() === fs.readFileSync('firestore.rules', 'utf8').trim()));
    const { keys } = await request(`https://apikeys.googleapis.com/v2/projects/${NUMBER}/locations/global/keys`);
    const allowed = ['identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firestore.googleapis.com', 'firebaseappcheck.googleapis.com', 'firebaseinstallations.googleapis.com'];
    check('Web API key is limited to used Firebase APIs', keys?.length && keys.every(key => key.restrictions?.apiTargets?.length && key.restrictions.apiTargets.every(target => allowed.includes(target.service))));
  }
  for (const name of endpoints) {
    const url = `https://asia-northeast1-${PROJECT}.cloudfunctions.net/${name}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"data":{}}', signal: AbortSignal.timeout(20000) });
    check(`${name}: no App Check is rejected`, response.status === 401);
  }
  const cors = await fetch(`https://asia-northeast1-${PROJECT}.cloudfunctions.net/claimDaily`, {
    method: 'OPTIONS', headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' }, signal: AbortSignal.timeout(20000)
  });
  check('Unapproved browser origin has no CORS access', !cors.headers.has('access-control-allow-origin'));
  for (const collection of ['users', 'threads', 'reports', 'lineLinks', 'events', 'admins', 'adminContent', 'adminEventSecrets', 'adminAudit']) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}`, { signal: AbortSignal.timeout(20000) });
    check(`${collection}: unauthenticated listing is rejected`, [401, 403].includes(response.status));
  }
  console.log(JSON.stringify({ project: PROJECT, checkedAt: new Date().toISOString(), checks }, null, 2));
  if (checks.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
