const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(enabled = true) {
  let clock = 0, sequence = 0;
  const timers = new Map(), notifications = [];
  const storage = new Map();
  const window = { Cloud: { enabled }, UI: { showAchievement: def => notifications.push(def.id), hideAchievement() {} } };
  const context = vm.createContext({ window, UI: window.UI, structuredClone, console,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout(fn, delay = 0) { const id = ++sequence; timers.set(id, { fn, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  for (const file of ['store', 'achievements']) vm.runInContext(fs.readFileSync(require.resolve(`../js/${file}.js`), 'utf8'), context);
  const store = window.Store;
  store.init();
  function flush() {
    for (let i = 0; timers.size; i++) {
      assert.ok(i < 100, 'achievement evaluation must settle');
      const [id, task] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      timers.delete(id); clock = task.at; task.fn();
    }
  }
  const remote = (points, uid = 'alice') => store.applyRemote({ totalEarned: points, points, loginTotal: 1, profile: { name: uid } }, uid, true);
  return { window, store, notifications, flush, remote };
}

test('cloud boot ignores preview data and restores existing achievements silently', () => {
  const h = setup();
  h.store.state.totalEarned = 99999;
  h.window.Achievements.evaluateAll(); h.flush();
  assert.equal(h.store.state.achievements.length, 0);
  h.remote(2030); h.flush();
  assert.ok(h.store.state.achievements.includes('points-1000'));
  assert.deepEqual(h.notifications, []);
});

test('reload and repeated logins never announce already earned achievements', () => {
  for (let reload = 0; reload < 2; reload++) {
    const h = setup();
    for (let login = 0; login < 3; login++) {
      h.remote(2030); h.flush(); h.remote(2030); h.flush();
      assert.ok(h.store.state.achievements.includes('points-500'));
      h.store.clearRemote({ clearPersonal: true }); h.flush();
    }
    assert.deepEqual(h.notifications, []);
  }
});

test('a new achievement during the session is announced once, not on later snapshots', () => {
  const h = setup();
  h.remote(99); h.flush(); h.remote(100); h.flush();
  h.remote(100); h.store.commit(); h.flush();
  assert.deepEqual(h.notifications, ['points-100']);
});

test('logout cancels queued achievement notifications', () => {
  const h = setup();
  h.remote(99); h.flush(); h.remote(1000);
  h.store.clearRemote({ clearPersonal: true }); h.flush();
  assert.deepEqual(h.notifications, []);
});

test('account switching neither carries badges nor delivers the previous account queue', () => {
  const h = setup();
  h.remote(99); h.flush(); h.remote(1000);
  h.remote(5, 'bob'); h.flush();
  assert.deepEqual(h.notifications, []);
  assert.ok(!h.store.state.achievements.includes('points-1000'));
  h.remote(100, 'bob'); h.flush();
  assert.deepEqual(h.notifications, ['points-100']);
});

test('local preview still announces newly earned achievements only once', () => {
  const h = setup(false);
  h.store.state.totalEarned = 100;
  h.window.Achievements.evaluateAll(); h.flush();
  h.window.Achievements.evaluateAll(); h.flush();
  assert.deepEqual(h.notifications, ['points-100']);
});
