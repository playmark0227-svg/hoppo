const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, collection, query, where, getDocs } = require('firebase/firestore');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-hoppo', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [path, value] of Object.entries({
      'users/alice': { points: 10, profile: { birthday: '2000-01-01', region: 'private' } },
      'users/bob': { points: 20 }, 'users/suspended': { suspended: true }, 'publicProfiles/alice': { name: 'Alice', totalEarned: 10 },
      'threads/ab': { members: ['alice', 'bob'] }, 'threads/ab/messages/1': { senderId: 'alice', text: 'hello' },
      'threads/ac': { members: ['alice', 'carol'] }, 'threads/ac/messages/1': { senderId: 'alice', text: 'blocked' },
      'users/carol/blocks/alice': { at: 'now' }, 'events/secret': { points: 500 }, 'reports/1': { reason: 'private' }
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
  await assertSucceeds(getDocs(query(collection(dbFor('alice'), 'threads'), where('members', 'array-contains', 'alice'))));
  await assertSucceeds(getDoc(doc(dbFor('bob'), 'threads/ab/messages/1')));
  await assertFails(getDoc(doc(dbFor('outsider'), 'threads/ab/messages/1')));
  await assertFails(setDoc(doc(dbFor('alice'), 'threads/ab/messages/2'), { text: 'forged' }));
});
test('block disables reading messages; internal events and reports stay private', async () => {
  await assertFails(getDoc(doc(dbFor('alice'), 'threads/ac/messages/1')));
  await assertFails(getDoc(doc(dbFor('carol'), 'threads/ac/messages/1')));
  await assertFails(getDoc(doc(dbFor('alice'), 'events/secret')));
  await assertFails(getDoc(doc(dbFor('alice'), 'reports/1')));
});
