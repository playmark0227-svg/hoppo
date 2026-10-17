const { spawnSync } = require('node:child_process');
for (const args of [
  ['--test', 'tests/security.test.cjs', 'tests/policy.test.cjs', 'tests/store.test.cjs', 'tests/auth.test.cjs', 'tests/hydration.test.cjs', 'tests/achievements.test.cjs', 'tests/content.test.cjs'],
  ['--test', 'tests/rules.test.cjs'],
  ['--test', 'tests/integration.test.cjs'],
  ['--test', 'tests/admin-integration.test.cjs'],
  ['tests/browser-file-entry.cjs'],
  ['tests/browser-admin.cjs'],
  ['tests/loader-layout.cjs'],
  ['tests/browser-cloud.cjs'],
  ['tests/browser-auth-recovery.cjs']
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
