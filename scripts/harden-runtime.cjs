const { cloudAdmin, PROJECT, NUMBER } = require('./cloud-admin.cjs');
const runtime = `hoppo-runtime@${PROJECT}.iam.gserviceaccount.com`;
const build = `${NUMBER}-compute@developer.gserviceaccount.com`;
const iam = 'https://iam.googleapis.com/v1';

async function main() {
  const phase = process.argv[2];
  if (!['--prepare', '--finish'].includes(phase)) throw new Error('Use --prepare before deployment, --finish only after runtime verification.');
  const request = await cloudAdmin();
  const accountPath = account => `${iam}/projects/${PROJECT}/serviceAccounts/${account}`;
  if (phase === '--prepare') {
    try { await request(accountPath(runtime)); }
    catch (error) {
      if (error.status !== 404) throw error;
      await request(`${iam}/projects/${PROJECT}/serviceAccounts`, { method: 'POST', body: {
        accountId: 'hoppo-runtime', serviceAccount: { displayName: 'Hoppo application runtime (no build permissions)' }
      } });
    }
    for (const [roleId, permissions] of [
      ['hoppoRuntimeAuth', ['firebaseauth.users.get', 'firebaseauth.users.delete']],
      ['hoppoTokenSigner', ['iam.serviceAccounts.signBlob']]
    ]) {
      const role = { title: roleId, description: 'Least privilege for Hoppo application runtime', includedPermissions: permissions, stage: 'GA' };
      try {
        const existing = await request(`${iam}/projects/${PROJECT}/roles/${roleId}`);
        if (JSON.stringify([...existing.includedPermissions].sort()) !== JSON.stringify([...permissions].sort())) {
          await request(`${iam}/projects/${PROJECT}/roles/${roleId}?updateMask=includedPermissions`, { method: 'PATCH', body: { ...role, etag: existing.etag } });
        }
      } catch (error) {
        if (error.status !== 404) throw error;
        await request(`${iam}/projects/${PROJECT}/roles`, { method: 'POST', body: { roleId, role } });
      }
    }
  } else {
    const { functions } = await request(`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/asia-northeast1/functions`);
    if (!functions?.length || functions.some(fn => fn.state !== 'ACTIVE' || fn.serviceConfig.serviceAccountEmail !== runtime)) {
      throw new Error('Every application function must be ACTIVE on hoppo-runtime before removing old permissions.');
    }
  }
  const policyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}`;
  const policy = await request(`${policyUrl}:getIamPolicy`, { method: 'POST', body: {} });
  const member = `serviceAccount:${runtime}`;
  if (phase === '--prepare') {
    for (const role of ['roles/datastore.user', 'roles/logging.logWriter', `projects/${PROJECT}/roles/hoppoRuntimeAuth`]) {
      let binding = policy.bindings.find(item => item.role === role && !item.condition);
      if (!binding) { binding = { role, members: [] }; policy.bindings.push(binding); }
      if (!binding.members.includes(member)) binding.members.push(member);
    }
  } else {
    for (const binding of policy.bindings) {
      if (['roles/datastore.user', 'roles/firebaseauth.admin'].includes(binding.role) && !binding.condition) {
        binding.members = binding.members.filter(value => value !== `serviceAccount:${build}`);
      }
    }
    policy.bindings = policy.bindings.filter(binding => binding.members.length);
  }
  await request(`${policyUrl}:setIamPolicy`, { method: 'POST', body: { policy } });
  const resource = accountPath(phase === '--prepare' ? runtime : build);
  const selfPolicy = await request(`${resource}:getIamPolicy`, { method: 'POST', body: {} });
  if (phase === '--prepare') {
    const role = `projects/${PROJECT}/roles/hoppoTokenSigner`;
    selfPolicy.bindings ||= [];
    if (!selfPolicy.bindings.some(binding => binding.role === role && binding.members.includes(member))) {
      selfPolicy.bindings.push({ role, members: [member] });
    }
  } else {
    selfPolicy.bindings = (selfPolicy.bindings || []).map(binding => binding.role === 'roles/iam.serviceAccountTokenCreator'
      ? { ...binding, members: binding.members.filter(value => value !== `serviceAccount:${build}`) } : binding).filter(binding => binding.members.length);
  }
  await request(`${resource}:setIamPolicy`, { method: 'POST', body: { policy: selfPolicy } });
  console.log(`${PROJECT}: ${phase === '--prepare' ? 'runtime prepared with datastore, auth get/delete and self-signBlob only' : 'build identity no longer has application-data, Auth-admin or self-token permissions'}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
