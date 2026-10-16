const { HttpsError } = require('firebase-functions/v2/https');

const ORIGINS = ['https://hoppo-status.vifight.com', 'https://playmark0227-svg.github.io'];
const reject = (code, message, details) => { throw new HttpsError(code, message, details); };

function validateRequest(req, emulator = false, maxBytes = 16384) {
  const origin = req.rawRequest?.get('origin');
  if (!emulator && origin && !ORIGINS.includes(origin)) reject('permission-denied', 'この接続元は利用できません。');
  if (!req.data || typeof req.data !== 'object' || Array.isArray(req.data) ||
      Buffer.byteLength(JSON.stringify(req.data)) > maxBytes) {
    reject('invalid-argument', '送信内容が無効、または大きすぎます。');
  }
}

function validateSession(token, identity, now = Date.now()) {
  if (!identity || identity.disabled) reject('unauthenticated', '再度ログインしてください。');
  const issued = token.auth_time;
  const validAfter = Date.parse(identity.tokensValidAfterTime || '') / 1000;
  if (!Number.isFinite(issued) || issued <= 0 || issued > now / 1000 + 60 ||
      (Number.isFinite(validAfter) && issued < validAfter)) {
    reject('unauthenticated', 'ログイン情報が失効しました。再度ログインしてください。');
  }
  if (!(token.lineVerified === true || (token.email_verified === true && identity.emailVerified === true))) {
    reject('permission-denied', 'メールアドレスを確認してください。');
  }
}

function requireRecentLogin(token, now = Date.now()) {
  const age = now / 1000 - token.auth_time;
  if (!Number.isFinite(age) || age < -60 || age > 300) {
    reject('failed-precondition', '一度ログアウトし、再ログインしてから操作してください。', { reason: 'recent-login-required' });
  }
}

module.exports = { ORIGINS, validateRequest, validateSession, requireRecentLogin };
