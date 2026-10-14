const crypto = require('node:crypto');
const functionRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp, applicationDefault } = functionRequire('firebase-admin/app');
const { getFirestore } = functionRequire('firebase-admin/firestore');
const P = require('../functions/policy.cjs');
const catalog = require('../functions/catalog.json');
const [projectId, label, pointsString, expiresString, stampId = ''] = process.argv.slice(2);
const points = Number(pointsString), expiresAt = Date.parse(expiresString);
if (stampId && !catalog.stampIds.includes(stampId)) throw new Error('Unknown stamp ID. Check js/data.js.');
if (!projectId || !label || !Number.isSafeInteger(points) || points < 1 || points > 500 ||
    !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
  throw new Error('Usage: node scripts/create-event.cjs PROJECT LABEL POINTS EXPIRES_ISO [STAMP_ID]');
}
initializeApp({ credential: applicationDefault(), projectId });
const code = `HOPPO:${crypto.randomBytes(32).toString('base64url')}`;
getFirestore().doc(`events/${P.hash(code)}`).create({ label: P.clean(label, 100), points, expiresAt, stampId, active: true })
  .then(() => console.log(code)).catch((error) => { console.error(error.message); process.exitCode = 1; });
