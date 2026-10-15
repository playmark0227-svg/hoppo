const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../js/cloud.js'), 'utf8');

function harness() {
  const nodes = new Map(), events = { snapshots: [], clear: 0, applied: [] };
  const document = {
    activeElement: null,
    querySelectorAll() { return []; },
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        value: '', textContent: '', checked: true, hidden: false, dataset: {},
        classList: { toggle() {} }, addEventListener() {}, setAttribute() {},
        removeAttribute() {}, focus() {}
      });
      return nodes.get(id);
    }
  };
  const user = {
    uid: 'test-uid', email: 'test@example.com', emailVerified: true,
    async getIdTokenResult() { return { claims: {}, signInProvider: 'password' }; },
    async getIdToken() { return 'token'; }
  };
  const sdk = {
    initializeApp() { return {}; }, getAuth() { return {}; }, getFirestore() { return {}; }, getFunctions() { return {}; },
    connectAuthEmulator() {}, connectFirestoreEmulator() {}, connectFunctionsEmulator() {},
    onAuthStateChanged(_auth, callback) { events.auth = callback; return () => {}; },
    doc(_db, ...path) { return path.join('/'); },
    collection(_db, ...path) { return path.join('/'); },
    query(ref) { return ref; }, orderBy() {}, limit() {}, where() {},
    async getDoc(ref) { return { exists: () => true, data: () => ref.startsWith('users/') ? { termsVersion: '2026-10-14' } : { name: '友達' } }; },
    async getDocFromServer(ref) { return this.getDoc(ref); },
    httpsCallable(_functions, name) { return async () => ({ data: { name } }); },
    onSnapshot(ref, _options, callback, error) {
      if (typeof _options === 'function') { error = callback; callback = _options; }
      events.snapshots.push({ ref, callback, error });
      return () => {};
    }
  };
  const window = {
    HOPPO_CLOUD_CONFIG: { enabled: true, emulator: true, firebase: { apiKey: 'fake', projectId: 'demo-hoppo', appId: 'test' } },
    App: { showLoader() { events.progress = (events.progress || 0) + 1; }, finishLoading() {}, loadingError() { events.failed = true; } }
  };
  const context = vm.createContext({
    window, document, console, testSdk: sdk, sessionStorage: { getItem() { return null; } },
    location: { hostname: 'localhost', search: '' },
    Store: { clearRemote() { events.clear++; }, applyRemote(data) { events.applied.push(data.points); } },
    Settings: { syncFields() {} }, UI: { refreshHome() {} },
    setTimeout, clearTimeout
  });
  vm.runInContext(source.replace(/await import\('\.\/vendor\/firebase\.js\?v=\d+'\)/, 'testSdk'), context);
  return { window, events, user };
}

async function tick() { await new Promise(resolve => setImmediate(resolve)); }
function snapshot(ref, server = true) {
  return {
    metadata: { fromCache: !server }, exists: () => true,
    data: () => ref === 'users/test-uid' ? { points: 42, profile: { name: '保存済み' } } : {},
    docs: []
  };
}

test('startup waits for auth and every first server snapshot before releasing the home screen', async () => {
  const { window, events, user } = harness();
  let finished = false;
  const boot = window.Cloud.init().then(() => { finished = true; });
  await tick();
  assert.equal(finished, false, 'auth state is not known yet');
  events.auth(user);
  await tick();
  assert.equal(events.clear, 1, 'sign-in must not reset the store a second time');
  assert.equal(events.snapshots.length, 6);
  for (const watcher of events.snapshots) watcher.callback(snapshot(watcher.ref, false));
  events.snapshots[0].callback({ ...snapshot('users/test-uid', false), exists: () => false });
  await tick();
  assert.equal(finished, false, 'cached data must not release the loading gate');
  for (const watcher of events.snapshots.slice(0, 5)) watcher.callback(snapshot(watcher.ref));
  await tick();
  assert.equal(finished, false, 'messages are still loading');
  events.snapshots[5].callback(snapshot(events.snapshots[5].ref));
  await boot;
  assert.equal(finished, true);
  assert.equal(events.applied.at(-1), 42);
});

test('failed initial account load never releases the gate as a guest session', async () => {
  const { window, events, user } = harness();
  const boot = window.Cloud.init();
  await tick(); events.auth(user); await tick();
  events.snapshots[0].error(new Error('connection lost'));
  await assert.rejects(boot, /connection lost/);
  assert.equal(events.failed, true);
  assert.equal(events.clear, 1);
  const progress = events.progress;
  for (const watcher of events.snapshots.slice(1)) watcher.callback(snapshot(watcher.ref));
  await tick();
  assert.equal(events.progress, progress, 'late snapshots must not hide the retry button');
});
test('a queued private snapshot cannot repopulate state after logout', async () => {
  const { window, events, user } = harness();
  const boot = window.Cloud.init(); await tick();
  events.auth(user); await tick();
  events.snapshots[0].callback(snapshot('users/test-uid'));
  events.auth(null); await tick(); await boot;
  assert.deepEqual(events.applied, [], 'private callbacks queued before logout must be discarded');
  assert.equal(window.Cloud.account, null);
});

test('an unsubscribed conversation ignores a late message callback', async () => {
  const { window, events, user } = harness();
  const boot = window.Cloud.init(); await tick();
  events.auth(user); await tick();
  for (const watcher of events.snapshots) watcher.callback(snapshot(watcher.ref));
  await tick(); await boot;
  const delivered = [];
  const stop = window.Cloud.watchMessages('thread-a', messages => delivered.push(messages));
  const watcher = events.snapshots.at(-1);
  stop();
  watcher.callback({ docs: [{ id: 'message', data: () => ({ text: 'private' }) }] });
  assert.deepEqual(delivered, [], 'a previous thread must not render into a newly opened conversation');
});
