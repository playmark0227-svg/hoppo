// Use only after the owner explicitly identifies a registered application account.
const { cloudAdmin, PROJECT } = require('./cloud-admin.cjs');
async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || flag !== '--confirmed-account') {
    throw new Error('Usage: node scripts/grant-content-admin.cjs <confirmed registered email> --confirmed-account');
  }
  const request = await cloudAdmin();
  const result = await request(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method: 'POST', body: { email: [email] } });
  const user = result.users?.find(value => value.email?.toLowerCase() === email.toLowerCase());
  if (!user || !user.emailVerified || user.disabled) throw new Error('メール確認済み・有効な登録アカウントが必要です。');
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const account = await request(`${base}/users/${user.localId}`);
  if (account.fields?.suspended?.booleanValue || account.fields?.deleting?.booleanValue) throw new Error('停止・削除中のアカウントには付与できません。');
  let exists = false;
  try {
    const current = await request(`${base}/admins/${user.localId}`); exists = true;
    if (current.fields?.enabled?.booleanValue) { console.log('このアカウントは既に管理者です。'); return; }
  } catch (error) { if (error.status !== 404) throw error; }
  if (exists) throw new Error('無効化済み管理者の再有効化は、運営担当が既存設定を確認して行ってください。');
  await request(`${base}:commit`, { method: 'POST', body: { writes: [{
    update: { name: `projects/${PROJECT}/databases/(default)/documents/admins/${user.localId}`, fields: {
      enabled: { booleanValue: true }, grantedAt: { timestampValue: new Date().toISOString() },
      grantedBy: { stringValue: 'ayumu.k@vifight.com' }
    } }, currentDocument: { exists: false }
  }] } });
  const saved = await request(`${base}/admins/${user.localId}`);
  if (saved.fields?.enabled?.booleanValue !== true) throw new Error('権限の保存を確認できません。');
  console.log(`${PROJECT}: 指定された登録アカウント1件を管理者として設定しました。`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
