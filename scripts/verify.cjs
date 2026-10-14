const { spawnSync } = require('node:child_process');
for (const args of [
  ['--test', 'tests/policy.test.cjs', 'tests/store.test.cjs'],
  ['--test', 'tests/rules.test.cjs'],
  ['--test', 'tests/integration.test.cjs'],
  ['tests/browser-cloud.cjs']
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
