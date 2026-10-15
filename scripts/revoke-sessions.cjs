const { cloudAdmin, PROJECT } = require('./cloud-admin.cjs');

async function main() {
  const [id, mode] = process.argv.slice(2);
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(id || '') || !['--revoke', '--suspend'].includes(mode)) {
    throw new Error('Usage: node scripts/revoke-sessions.cjs UID --revoke|--suspend');
  }
  const request = await cloudAdmin();
  const authPath = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`;
  const firestore = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)`;
  await request(`${authPath}:lookup`, { method: 'POST', body: { localId: [id] } });
  const document = await request(`${firestore}/documents/users/${id}`);
  // Rules are denied first; then the Auth refresh token is invalidated. Existing data is retained.
  const cutoff = Math.floor(Date.now() / 1000) + 1;
  const fields = { sessionsRevokedAt: { integerValue: String(cutoff) } };
  if (mode === '--suspend') fields.suspended = { booleanValue: true };
  const writes = [{ update: { name: document.name, fields }, updateMask: { fieldPaths: Object.keys(fields) },
    currentDocument: { updateTime: document.updateTime } }];
  if (mode === '--suspend') writes.push({ delete: `projects/${PROJECT}/databases/(default)/documents/publicProfiles/${id}` });
  await request(`${firestore}/documents:commit`, { method: 'POST', body: { writes } });
  await request(`${authPath}:update`, { method: 'POST', body: {
    localId: id, validSince: String(cutoff), ...(mode === '--suspend' ? { disableUser: true } : {})
  } });
  console.log(`${PROJECT}: account sessions ${mode === '--suspend' ? 'suspended' : 'revoked'}. No profile or message content was exported.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
