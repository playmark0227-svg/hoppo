const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/store.js'), 'utf8');

function setup(enabled, failWrites = false, device = null) {
  const writes = [];
  const legacy = JSON.stringify({ points: 99999, totalEarned: 99999, name: 'Preview', profile: { bio: 'private biography' } });
  const window = { Cloud: { enabled }, UI: { toast() { throw new Error('Unexpected quota toast'); } } };
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
