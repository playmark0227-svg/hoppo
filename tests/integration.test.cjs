const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, signOut } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');
const functionRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp: adminInit, deleteApp: adminDelete } = functionRequire('firebase-admin/app');
const { getAuth: adminAuth } = functionRequire('firebase-admin/auth');
const { getFirestore } = functionRequire('firebase-admin/firestore');
const P = require('../functions/policy.cjs');
const catalog = require('../functions/catalog.json');
const apps = [], users = {};
let admin, db;
async function client(name, verified = true) {
  const app = initializeApp({ apiKey: 'fake-key', projectId: 'demo-hoppo', appId: `fake-${name}` }, name); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const fn = getFunctions(app, 'asia-northeast1'); connectFunctionsEmulator(fn, '127.0.0.1', 5001);
  const email = `${name}@example.test`, password = 'a-very-long-test-password';
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (verified) { await adminAuth(admin).updateUser(credential.user.uid, { emailVerified: true }); await signOut(auth); await signInWithEmailAndPassword(auth, email, password); }
  const call = async (functionName, data = {}) => (await httpsCallable(fn, functionName)(data)).data;
  return { uid: credential.user.uid, call, auth };
}
before(async () => {
  admin = adminInit({ projectId: 'demo-hoppo' }, 'tests'); db = getFirestore(admin);
  for (const id of ['alice', 'bob', 'outsider']) {
    users[id] = await client(id); await users[id].call('ensureAccount', { termsVersion: P.VERSION, name: id });
  }
});
after(async () => { await Promise.all(apps.map(app => deleteApp(app))); await adminDelete(admin); });
test('unverified email and missing consent are rejected', async () => {
  const unverified = await client('unverified', false);
  await assert.rejects(unverified.call('ensureAccount', { termsVersion: P.VERSION }), { code: "functions/permission-denied" });
  await assert.rejects(users.alice.call('ensureAccount', { termsVersion: 'old' }), { code: "functions/failed-precondition" });
});
test('daily concurrency grants only one server award', async () => {
  const results = await Promise.all([users.alice.call('claimDaily'), users.alice.call('claimDaily')]);
  assert.equal(results.reduce((n, r) => n + r.points, 0), 5);
  const state = (await db.doc(`users/${users.alice.uid}`).get()).data(); assert.equal(state.points, 5);
});
test('server-issued LINE custom authentication survives token refresh', async () => {
  const app = initializeApp({ apiKey: 'fake-key', projectId: 'demo-hoppo', appId: 'test-line' }, 'line-custom'); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const fn = getFunctions(app, 'asia-northeast1'); connectFunctionsEmulator(fn, '127.0.0.1', 5001);
  const token = await adminAuth(admin).createCustomToken('line_test', { lineVerified: true });
  const credential = await signInWithCustomToken(auth, token);
  await credential.user.getIdToken(true);
  const result = await httpsCallable(fn, 'ensureAccount')({ termsVersion: P.VERSION, name: 'LINEテスト' });
  assert.equal(result.data.ok, true);
});
test('LINE linking requires a verified password session and explicit consent', async () => {
  await assert.rejects(users.alice.call('linkLineAccount', { idToken: 'x'.repeat(100), consent: false }), { code: 'functions/invalid-argument' });
  await assert.rejects(users.alice.call('linkLineAccount', { idToken: 'x'.repeat(100), consent: true }), { code: 'functions/failed-precondition' });
  const unverified = await client('line-link-unverified', false);
  await assert.rejects(unverified.call('linkLineAccount', { idToken: 'x'.repeat(100), consent: true }), { code: 'functions/permission-denied' });
});
test('a LINE login cannot create a second account after it is linked', async () => {
  const lineHash = P.hash('race-test-line-user');
  await db.doc(`lineLinks/${lineHash}`).set({ uid: users.alice.uid, linkedAt: new Date().toISOString() });
  const app = initializeApp({ apiKey: 'fake-key', projectId: 'demo-hoppo', appId: 'test-linked-line' }, 'linked-line'); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const fn = getFunctions(app, 'asia-northeast1'); connectFunctionsEmulator(fn, '127.0.0.1', 5001);
  const token = await adminAuth(admin).createCustomToken(`line_${lineHash}`, { lineVerified: true, lineHash });
  await signInWithCustomToken(auth, token);
  await assert.rejects(httpsCallable(fn, 'ensureAccount')({ termsVersion: P.VERSION }), { code: 'functions/already-exists' });
  assert.equal((await db.doc(`users/line_${lineHash}`).get()).exists, false);
});
test('quiz awards are authoritative, idempotent and bounded on replay', async () => {
  const quiz = catalog.quizzes[0];
  let last;
  for (let run = 0; run < 2; run++) {
    const session = await users.alice.call('beginQuiz', { quizId: quiz.id });
    assert.equal('answer' in session.questions[0], false);
    await assert.rejects(users.bob.call('answerQuiz', { sessionId: session.sessionId, index: 0, choice: 0 }), { code: "functions/permission-denied" });
    for (let index = 0; index < quiz.questions.length; index++) last = await users.alice.call('answerQuiz', { sessionId: session.sessionId, index, choice: quiz.questions[index].answer });
    assert.equal(last.earned, run === 0 ? quiz.questions.length * 10 + 50 : 0);
    const duplicate = await users.alice.call('answerQuiz', { sessionId: session.sessionId, index: quiz.questions.length - 1, choice: quiz.questions.at(-1).answer });
    assert.deepEqual(duplicate, last);
  }
});
test('batched quiz grades once, updates points, and replays safely', async () => {
  const quiz = catalog.quizzes[1];
  const answers = quiz.questions.map(q => q.answer);
  const data = { quizId: quiz.id, version: catalog.version, answers, requestId: 'batch-quiz-test-0001' };
  const [first, replay] = await Promise.all([users.alice.call('submitQuiz', data), users.alice.call('submitQuiz', data)]);
  const expected = quiz.questions.length * 10 + 50;
  assert.deepEqual(first, { correctCount: quiz.questions.length, total: quiz.questions.length, earned: expected });
  assert.deepEqual(replay, first);
  const state = (await db.doc(`users/${users.alice.uid}`).get()).data();
  assert.equal(state.quizResults[`${catalog.version}:${quiz.id}`].timesPlayed, 1);
  assert.equal(state.points, 5 + catalog.quizzes[0].questions.length * 10 + 50 + expected);
  await assert.rejects(users.alice.call('submitQuiz', { ...data, version: 'old' }), { code: 'functions/failed-precondition' });
  await assert.rejects(users.alice.call('submitQuiz', { ...data, answers: [0] }), { code: 'functions/invalid-argument' });
  const wrongAnswers = [...answers];
  wrongAnswers[0] = (answers[0] + 1) % quiz.questions[0].choices.length;
  const second = await users.alice.call('submitQuiz', {
    ...data, answers: wrongAnswers, requestId: 'batch-quiz-test-0002', correctCount: quiz.questions.length, earned: 9999
  });
  assert.equal(second.correctCount, quiz.questions.length - 1);
  assert.equal(second.earned, 0);
  assert.equal((await db.doc(`users/${users.alice.uid}`).get()).data().quizResults[`${catalog.version}:${quiz.id}`].timesPlayed, 2);
});
test('QR codes are server-issued, expire and redeem once even concurrently', async () => {
  const code = 'HOPPO:' + 'a'.repeat(43);
  await db.doc(`events/${P.hash(code)}`).set({ active: true, expiresAt: Date.now() + 60000, label: 'test', points: 30, stampId: 'nosappu' });
  await assert.rejects(users.alice.call('redeemEvent', { code: 'HOPPO2026' }), { code: "functions/invalid-argument" });
  const results = await Promise.all([users.alice.call('redeemEvent', { code }), users.alice.call('redeemEvent', { code })]);
  assert.equal(results.reduce((sum, r) => sum + r.points, 0), 30);
  await db.doc(`events/${P.hash(code)}`).update({ expiresAt: 0 });
  await assert.rejects(users.bob.call('redeemEvent', { code }), { code: "functions/not-found" });
});
test('profile privacy, mutual follows, idempotent DM, blocking and reports', async () => {
  for (const name of ['alice', 'bob']) await users[name].call('updateProfile', { profile: { name, birthday: '2000-01-01', publicRanking: true, dmEnabled: true, bio: 'private bio', region: 'private region' } });
  const a = users.alice, b = users.bob;
  const pub = (await db.doc(`publicProfiles/${a.uid}`).get()).data();
  assert.equal(pub.birthday, undefined); assert.equal(pub.region, undefined); assert.equal(pub.bio, undefined);
  const message = { targetId: b.uid, text: '<img src=x onerror=alert(1)>', requestId: 'idempotency-test-0001' };
  await a.call('setFollow', { targetId: b.uid, follow: true });
  await assert.rejects(a.call('sendMessage', message), { code: "functions/permission-denied" });
  await b.call('setFollow', { targetId: a.uid, follow: true });
  const [one, two] = await Promise.all([a.call('sendMessage', message), a.call('sendMessage', message)]);
  assert.equal(one.threadId, two.threadId);
  assert.equal((await db.collection(`threads/${one.threadId}/messages`).get()).size, 1);
  await a.call('reportUser', { targetId: b.uid, reason: 'test report' });
  await b.call('setBlock', { targetId: a.uid, block: true });
  await assert.rejects(a.call('sendMessage', { ...message, requestId: 'idempotency-test-0002' }), { code: "functions/permission-denied" });
  assert.equal((await db.doc(`users/${a.uid}/following/${b.uid}`).get()).exists, false);
  await b.call('setBlock', { targetId: a.uid, block: false });
  await a.call('updateProfile', { profile: { name: 'alice', publicRanking: false } });
  assert.equal((await db.doc(`publicProfiles/${a.uid}`).get()).exists, false);
});
test('under-18 DM, unknown quiz and unconfigured LINE are rejected', async () => {
  await assert.rejects(users.bob.call('updateProfile', { profile: { birthday: '2015-01-01', publicRanking: true, dmEnabled: true } }), { code: "functions/failed-precondition" });
  await assert.rejects(users.bob.call('beginQuiz', { quizId: 'nonexistent' }), { code: "functions/not-found" });
  await assert.rejects(users.bob.call('exchangeLineToken', { idToken: 'x'.repeat(100) }), { code: "functions/failed-precondition" });
});
test('account deletion removes private state and both-party conversations', async () => {
  const id = users.bob.uid;
  await users.bob.call('deleteAccount');
  await assert.rejects(users.bob.call('ensureAccount', { termsVersion: P.VERSION }), { code: 'functions/unauthenticated' });
  assert.equal((await db.doc(`users/${id}`).get()).exists, false);
  assert.equal((await db.doc(`publicProfiles/${id}`).get()).exists, false);
  assert.equal((await db.collection('threads').where('members', 'array-contains', id).get()).size, 0);
});
