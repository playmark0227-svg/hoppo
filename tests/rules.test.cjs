const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, limit, getDocs } = require('firebase/firestore');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-hoppo', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [path, value] of Object.entries({
      'users/alice': { points: 10, profile: { birthday: '2000-01-01', region: 'private' } },
      'users/bob': { points: 20 }, 'users/outsider': { points: 0 }, 'users/suspended': { suspended: true },
      'users/deleting': { deleting: true }, 'users/revoked': { sessionsRevokedAt: 2000 },
      'publicProfiles/alice': { name: 'Alice', totalEarned: 10 },
      'threads/ab': { members: ['alice', 'bob'] }, 'threads/ab/messages/1': { senderId: 'alice', text: 'hello' },
      'threads/ac': { members: ['alice', 'carol'] }, 'threads/ac/messages/1': { senderId: 'alice', text: 'blocked' },
      'users/carol/blocks/alice': { at: 'now' }, 'events/secret': { points: 500 }, 'reports/1': { reason: 'private' },
      'content/catalog': { revision: 1, notices: [] }, 'adminContent/catalog': { private: true },
      'admins/alice': { enabled: true }, 'adminEventSecrets/secret': { code: 'not-public' },
      'adminAudit/secret': { uid: 'alice' }
    })) await setDoc(doc(db, path), value);
  });
});
after(async () => { if (env) { await env.clearFirestore(); await env.cleanup(); } });
const dbFor = (id, claims = { email_verified: true }) => env.authenticatedContext(id, claims).firestore();
test('anonymous and unverified users cannot read profiles', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicProfiles/alice')));
  await assertFails(getDoc(doc(dbFor('alice', { email_verified: false }), 'users/alice')));
});
test('private state is readable only by owner and cannot be client-written', async () => {
  await assertSucceeds(getDoc(doc(dbFor('alice'), 'users/alice')));
  await assertFails(getDoc(doc(dbFor('bob'), 'users/alice')));
  await assertFails(setDoc(doc(dbFor('alice'), 'users/alice'), { points: 999999 }));
  await assertFails(setDoc(doc(dbFor('alice'), 'publicProfiles/alice'), { totalEarned: 999999 }));
});
test('LINE custom claims authorize but do not bypass ownership', async () => {
  await assertSucceeds(getDoc(doc(dbFor('alice', { lineVerified: true }), 'users/alice')));
  await assertFails(getDoc(doc(dbFor('alice', { lineVerified: true }), 'users/bob')));
});
test('verified but unregistered or suspended users cannot read rankings', async () => {
  await assertFails(getDoc(doc(dbFor('not-registered'), 'publicProfiles/alice')));
  await assertFails(getDoc(doc(dbFor('suspended'), 'publicProfiles/alice')));
});
test('DM membership query and third-party isolation', async () => {
  await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'threads'), where('members', 'array-contains', 'alice'), limit(50))));
  await assertSucceeds(getDoc(doc(dbFor('bob'), 'threads/ab/messages/1')));
  await assertFails(getDoc(doc(dbFor('outsider'), 'threads/ab/messages/1')));
  await assertFails(setDoc(doc(dbFor('alice'), 'threads/ab/messages/2'), { text: 'forged' }));
});
test('suspended, deleting and explicitly revoked sessions lose all private and public reads', async () => {
  for (const id of ['suspended', 'deleting', 'revoked']) {
    const db = dbFor(id, { email_verified: true, auth_time: 1000 });
    await assertFails(getDoc(doc(db, `users/${id}`)));
    await assertFails(getDoc(doc(db, 'publicProfiles/alice')));
    await assertFails(getDocs(query(collection(db, `users/${id}/following`), limit(100))));
  }
  await assertSucceeds(getDoc(doc(dbFor('revoked', { email_verified: true, auth_time: 2001 }), 'users/revoked')));
  await assertSucceeds(getDoc(doc(dbFor('new-user'), 'users/new-user')));
});
test('collection scans require a bounded query and cannot enumerate private users', async () => {
  const db = dbFor('alice');
  for (const [path, maximum] of [['publicProfiles', 100], ['threads/ab/messages', 100]]) {
    await assertFails(getDocs(collection(db, path)));
    await assertFails(getDocs(query(collection(db, path), limit(maximum + 1))));
    await assertSucceeds(getDocs(query(collection(db, path), limit(maximum))));
  }
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(getDocs(query(collection(db, 'threads'), where('members', 'array-contains', 'alice'))));
  await assertFails(getDocs(query(collection(db, 'threads'), limit(50))));
  await assertSucceeds(getDocs(collection(db, 'users/alice/blocks')));
  await assertFails(getDocs(collection(dbFor('bob'), 'users/alice/blocks')));
});
test('admin-looking client claims never grant backend write authority or internal reads', async () => {
  const db = dbFor('alice', { email_verified: true, admin: true });
  for (const path of ['users/bob', 'threads/ab/messages/1', 'events/secret', 'reports/1', 'lineLinks/secret', 'quizSessions/secret']) {
    await assertFails(setDoc(doc(db, path), { forged: true }));
    await assertFails(deleteDoc(doc(db, path)));
  }
  await assertFails(updateDoc(doc(db, 'users/alice'), { suspended: false, points: 50000 }));
  for (const path of ['lineLinks/secret', 'quizSessions/secret', 'authLimits/secret', 'accountClosures/alice', 'users/alice/limits/dm']) {
    await assertFails(getDoc(doc(db, path)));
  }
});
test('block disables reading messages; internal events and reports stay private', async () => {
  await assertFails(getDoc(doc(dbFor('alice'), 'threads/ac/messages/1')));
  await assertFails(getDoc(doc(dbFor('carol'), 'threads/ac/messages/1')));
  await assertFails(getDoc(doc(dbFor('alice'), 'events/secret')));
  await assertFails(getDoc(doc(dbFor('alice'), 'reports/1')));
});
test('only the published catalog is public; even administrators cannot read drafts or QR secrets directly', async () => {
  for (const db of [env.unauthenticatedContext().firestore(), dbFor('alice', { email_verified: true, admin: true })]) {
    await assertSucceeds(getDoc(doc(db, 'content/catalog')));
    await assertFails(getDocs(collection(db, 'content')));
    await assertFails(setDoc(doc(db, 'content/catalog'), { forged: true }));
    for (const path of ['adminContent/catalog', 'admins/alice', 'adminEventSecrets/secret', 'adminAudit/secret', 'adminLimits/secret', 'adminOperations/secret']) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { forged: true }));
    }
  }
});
