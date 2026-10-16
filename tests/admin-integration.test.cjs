const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');
const adminRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp: adminInit, deleteApp: adminDelete } = adminRequire('firebase-admin/app');
const { getAuth: adminAuth } = adminRequire('firebase-admin/auth');
const { getFirestore } = adminRequire('firebase-admin/firestore');
const crypto = require('node:crypto');
const seed = require('../functions/content-seed.json');
const apps = []; let admin, db, owner, member, stamp, draftQuiz;
async function client(name) {
  const app = initializeApp({ apiKey: 'fake-key', projectId: 'demo-hoppo', appId: name }, name); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const fn = getFunctions(app, 'asia-northeast1'); connectFunctionsEmulator(fn, '127.0.0.1', 5001);
  const email = `${name}-${Date.now()}@example.test`, password = 'test-password-for-admin';
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await adminAuth(admin).updateUser(credential.user.uid, { emailVerified: true }); await signOut(auth); await signInWithEmailAndPassword(auth, email, password);
  const call = async (name, data = {}) => (await httpsCallable(fn, name)(data)).data;
  await call('ensureAccount', { termsVersion: '2026-10-14', name });
  return { uid: credential.user.uid, auth, call, manage: data => call('manageContent', data) };
}
before(async () => {
  admin = adminInit({ projectId: 'demo-hoppo' }, 'content-tests'); db = getFirestore(admin);
  owner = await client('content-owner'); member = await client('content-member');
  await db.doc(`admins/${owner.uid}`).set({ enabled: true });
});
after(async () => {
  for (const collection of ['content', 'adminContent', 'admins', 'adminAudit', 'adminEventSecrets', 'adminOperations', 'adminLimits']) await db.recursiveDelete(db.collection(collection));
  await Promise.all(apps.map(deleteApp)); await adminDelete(admin);
});
test('normal accounts and forged client roles cannot manage or load drafts', async () => {
  assert.equal((await member.manage({ action: 'status' })).authorized, false);
  await assert.rejects(member.manage({ action: 'load', admin: true }), { code: 'functions/permission-denied' });
  assert.equal((await owner.manage({ action: 'status' })).authorized, true);
});
test('stamp drafts stay private until publication and concurrent edits are rejected', async () => {
  await owner.manage({ action: 'load' });
  stamp = (await owner.manage({ action: 'save', kind: 'stamps', baseRevision: 0,
    item: { ...seed.stamps[0], id: 'admin-test-stamp', no: 101, name: '管理テスト施設', hint: '海の近く', body: '取得後の説明', lat: 43.3, lng: 145.5 } })).item;
  assert.ok(!(await db.doc('content/catalog').get()).data().stamps.some(item => item.id === stamp.id));
  await assert.rejects(owner.manage({ action: 'save', kind: 'stamps', baseRevision: 0, item: stamp }), { code: 'functions/aborted' });
  stamp = (await owner.manage({ action: 'publish', kind: 'stamps', id: stamp.id, baseRevision: stamp._revision })).item;
  assert.equal((await db.doc('content/catalog').get()).data().stamps.find(item => item.id === stamp.id).hint, '海の近く');
});
test('QR issuance is idempotent, redeemable, repeat-safe and can be disabled', async () => {
  const payload = { action: 'qrIssue', requestId: crypto.randomUUID().replaceAll('-', ''), label: 'テスト設置場所', points: 50,
    expiresAt: new Date(Date.now() + 86400000).toISOString(), stampId: stamp.id };
  const first = await owner.manage(payload), retry = await owner.manage(payload);
  assert.equal(first.code, retry.code); assert.match(first.code, /^HOPPO:/);
  const result = await member.call('redeemEvent', { code: first.code }); assert.equal(result.points, 50);
  assert.equal((await member.call('redeemEvent', { code: first.code })).alreadyClaimed, true);
  assert.equal((await owner.manage({ action: 'qrShow', eventId: first.eventId })).code, first.code);
  await owner.manage({ action: 'qrDisable', eventId: first.eventId });
  await assert.rejects(owner.call('redeemEvent', { code: first.code }), { code: 'functions/not-found' });
});
test('archiving a stamp stops new claims but retains acquired history', async () => {
  const issued = await owner.manage({ action: 'qrIssue', requestId: crypto.randomUUID().replaceAll('-', ''), label: '停止テスト', points: 10,
    expiresAt: new Date(Date.now() + 86400000).toISOString(), stampId: stamp.id });
  await owner.manage({ action: 'archive', kind: 'stamps', id: stamp.id, baseRevision: stamp._revision });
  await assert.rejects(owner.call('redeemEvent', { code: issued.code }), { code: 'functions/not-found' });
  assert.ok((await db.doc(`users/${member.uid}`).get()).data().stamps[stamp.id]);
  assert.equal((await db.doc('content/catalog').get()).data().stamps.find(item => item.id === stamp.id).archived, true);
});
test('quiz publishing requires source review and only changes the edited quiz edition', async () => {
  const state = await owner.manage({ action: 'load' }); draftQuiz = state.draft.items.quizzes.basics;
  draftQuiz = (await owner.manage({ action: 'save', kind: 'quizzes', item: { ...draftQuiz, title: '編集テスト' }, baseRevision: draftQuiz._revision })).item;
  await assert.rejects(owner.manage({ action: 'publish', kind: 'quizzes', id: draftQuiz.id, baseRevision: draftQuiz._revision }), { code: 'functions/failed-precondition' });
  draftQuiz = (await owner.manage({ action: 'publish', kind: 'quizzes', id: draftQuiz.id, baseRevision: draftQuiz._revision, reviewed: true })).item;
  assert.equal(draftQuiz.version, seed.version, 'metadata edits must preserve scores');
  const questions = structuredClone(draftQuiz.questions); questions[0].q += '（テスト）';
  draftQuiz = (await owner.manage({ action: 'save', kind: 'quizzes', item: { ...draftQuiz, questions }, baseRevision: draftQuiz._revision })).item;
  draftQuiz = (await owner.manage({ action: 'publish', kind: 'quizzes', id: draftQuiz.id, baseRevision: draftQuiz._revision, reviewed: true })).item;
  assert.match(draftQuiz.version, /^managed-/);
  const published = (await db.doc('content/catalog').get()).data();
  assert.equal(published.quizzes.find(q => q.id === 'entry').version, seed.version);
  await assert.rejects(member.call('submitQuiz', { quizId: 'basics', version: seed.version, answers: questions.map(q => q.answer), requestId: crypto.randomUUID().replaceAll('-', '') }), { code: 'functions/failed-precondition' });
  const result = await member.call('submitQuiz', { quizId: 'basics', version: draftQuiz.version, answers: questions.map(q => q.answer), requestId: crypto.randomUUID().replaceAll('-', '') });
  assert.equal(result.correctCount, questions.length);
});
test('restoring an unchanged quiz preserves its original edition and learning results', async () => {
  let item = (await owner.manage({ action: 'load' })).draft.items.quizzes.entry;
  item = (await owner.manage({ action: 'archive', kind: 'quizzes', id: item.id, baseRevision: item._revision })).item;
  item = (await owner.manage({ action: 'restore', kind: 'quizzes', id: item.id, baseRevision: item._revision })).item;
  item = (await owner.manage({ action: 'publish', kind: 'quizzes', id: item.id, baseRevision: item._revision, reviewed: true })).item;
  assert.equal(item.version, seed.version);
});
test('products, donation links, announcements, islands and ranks publish without changing user balances', async () => {
  const beforePoints = (await db.doc(`users/${member.uid}`).get()).data().points;
  for (const kind of ['shop', 'furusato', 'notices', 'islands', 'ranks']) {
    const state = await owner.manage({ action: 'load' });
    const source = seed[kind][0], fixed = ['islands', 'ranks'].includes(kind), key = fixed ? source.id : `admin-test-${kind}`;
    let item = (await owner.manage({ action: 'save', kind, baseRevision: fixed ? state.draft.items[kind][key]._revision : 0,
      item: { ...source, id: key, name: '運営編集テスト' } })).item;
    item = (await owner.manage({ action: 'publish', kind, id: key, baseRevision: item._revision })).item;
    assert.equal((await db.doc('content/catalog').get()).data()[kind].find(value => value.id === key).name, '運営編集テスト');
    if (!fixed) {
      await owner.manage({ action: 'archive', kind, id: key, baseRevision: item._revision });
      assert.ok(!(await db.doc('content/catalog').get()).data()[kind].some(value => value.id === key));
    }
  }
  assert.equal((await db.doc(`users/${member.uid}`).get()).data().points, beforePoints);
});
test('revoking the server role immediately denies further administration', async () => {
  await db.doc(`admins/${owner.uid}`).update({ enabled: false });
  await assert.rejects(owner.manage({ action: 'load' }), { code: 'functions/permission-denied' });
});
