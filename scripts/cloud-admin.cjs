const cliAuth = require('firebase-tools/lib/auth');
const PROJECT = 'hoppo-status-vifight';
const NUMBER = '715700450155';

async function cloudAdmin() {
  const account = cliAuth.getGlobalDefaultAccount();
  if (account?.user.email !== 'ayumu.k@vifight.com') throw new Error('会社アカウントのFirebase CLI認証が必要です。');
  const { access_token } = await cliAuth.getAccessToken(account.tokens.refresh_token,
    ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']);
  return async (url, { method = 'GET', body } = {}) => {
    const response = await fetch(url, { method, headers: {
      Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json'
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`Google API: HTTP ${response.status} (${data.error?.status || 'unknown'})`);
      error.status = response.status;
      error.apiMessage = data.error?.message;
      throw error;
    }
    return data;
  };
}
module.exports = { cloudAdmin, PROJECT, NUMBER };
