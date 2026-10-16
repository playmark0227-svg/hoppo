const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/store.js'), 'utf8');

function setup(enabled, failWrites = false, device = null, legacyPatch = {}, quizzes = []) {
  const writes = [];
  const legacy = JSON.stringify({ points: 99999, totalEarned: 99999, name: 'Preview', profile: { bio: 'private biography' }, ...legacyPatch });
  const window = { Cloud: { enabled }, QUIZZES: quizzes, QUIZ_CATALOG_VERSION: '2026-10-15', UI: { toast() { throw new Error('Unexpected quota toast'); } } };
  const context = vm.createContext({ window, structuredClone, console, UI: window.UI, localStorage: {
    getItem(key) { return key === 'hoppou_status_v1' ? legacy : key === 'hoppou_device_v2' && device ? JSON.stringify(device) : null; },
    setItem(key, value) { writes.push({ key, value }); if (failWrites) throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' }); }
  } });
  vm.runInContext(source, context);
  return { store: window.Store, writes };
}

test('cloud initialization never rewrites legacy state or persists cloud user data', () => {
  const { store, writes } = setup(true);
  store.init(); store.clearRemote();
  assert.equal(store.get().points, 0);
  store.applyRemote({ points: 50, totalEarned: 50, profile: { name: 'Private user', bio: 'private bio' } }, 'test-user-id', true);
  store.commit();
  assert.equal(store.get().points, 50);
  assert.ok(writes.every(w => w.key === 'hoppou_device_v2'));
  assert.ok(writes.every(w => !w.value.includes('private bio') && !w.value.includes('Private user') && !w.value.includes('totalEarned')));
});

test('cloud initialization remains usable when device storage is full', () => {
  const { store, writes } = setup(true, true);
  assert.doesNotThrow(() => { store.init(); store.clearRemote(); store.commit(); });
  assert.ok(writes.every(w => w.key === 'hoppou_device_v2'));
  assert.equal(store.get().points, 0);
});
test('uploaded avatars cannot carry over to another cloud account and are erased on logout', () => {
  const { store, writes } = setup(true, false, { avatarImage: 'private-photo', avatarOwner: 'alice' });
  store.init(); store.clearRemote();
  store.applyRemote({ profile: { name: 'Alice' } }, 'alice', true);
  assert.equal(store.getProfile().avatarImage, 'private-photo');
  store.applyRemote({ profile: { name: 'Bob' } }, 'bob', true);
  assert.equal(store.getProfile().avatarImage, '');
  store.clearRemote({ clearPersonal: true });
  assert.ok(!writes.at(-1).value.includes('private-photo'));
});

test('local preview retains its normal persisted state', () => {
  const { store, writes } = setup(false);
  store.init(); store.commit();
  assert.equal(store.get().points, 99999);
  assert.ok(writes.every(w => w.key === 'hoppou_status_v1'));
});

test('cloud reload preserves newer device preferences and tutorial completion', () => {
  const { store, writes } = setup(true, false, { flags: { tutorialSeen: true }, settings: { reduceMotion: true }, avatarImage: 'device-avatar', islandThemeOn: true });
  store.init();
  assert.equal(writes.length, 0);
  store.clearRemote();
  assert.equal(store.get().flags.tutorialSeen, true);
  assert.equal(store.get().settings.reduceMotion, true);
  assert.equal(store.get().profile.avatarImage, 'device-avatar');
  assert.equal(store.get().profile.islandThemeOn, true);
  assert.equal(store.get().points, 0);
});

test('a new quiz edition clears only local best scores, not earned points', () => {
  const { store } = setup(false, false, null, { quizCatalogVersion: '2026-10-14',
    quizResults: { basics: { bestScore: 9, timesPlayed: 2 } } });
  store.init();
  assert.equal(Object.keys(store.get().quizResults).length, 0);
  assert.equal(store.get().quizCatalogVersion, '2026-10-15');
  assert.equal(store.get().points, 99999);
});

test('cloud best scores show only the current quiz edition', () => {
  const { store } = setup(true);
  store.init(); store.clearRemote();
  store.applyRemote({ profile: { name: 'Tester' }, quizResults: {
    '2026-10-14:basics': { quizId: 'basics', bestScore: 9 },
    '2026-10-15:basics': { quizId: 'basics', bestScore: 4 }
  } }, 'user-id', false);
  assert.equal(store.get().quizResults.basics.bestScore, 4);
});
test('editing one managed quiz preserves every other quiz result and lifetime points', () => {
  const { store } = setup(true, false, null, {}, [{ id: 'basics', version: 'managed-new' }, { id: 'entry', version: '2026-10-15' }]);
  store.init(); store.clearRemote();
  store.applyRemote({ points: 200, totalEarned: 500, profile: { name: 'Tester' }, quizResults: {
    '2026-10-15:basics': { quizId: 'basics', bestScore: 5 },
    'managed-new:basics': { quizId: 'basics', bestScore: 2 },
    '2026-10-15:entry': { quizId: 'entry', bestScore: 3 }
  } }, 'user-id', false);
  assert.equal(store.get().quizResults.basics.bestScore, 2);
  assert.equal(store.get().quizResults.entry.bestScore, 3);
  assert.equal(store.get().totalEarned, 500);
});
