const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/cloud.js'), 'utf8');

function setup(testSdk = null) {
  const nodes = new Map();
  const document = {
    activeElement: null,
    querySelectorAll() { return []; },
    getElementById(id) {
      if (!nodes.has(id)) {
        const attributes = new Map(), handlers = new Map();
        const node = {
          value: '', textContent: '', hidden: false, checked: false, dataset: {}, classList: { toggle() {} },
          get validity() { return { valid: !!this.value && /^[^\s@]+@[^\s@]+$/.test(this.value) }; },
          setAttribute(key, value) { attributes.set(key, value); },
          removeAttribute(key) { attributes.delete(key); },
          getAttribute(key) { return attributes.get(key) ?? null; },
          addEventListener(name, fn) { handlers.set(name, fn); },
          trigger(name) { return handlers.get(name)?.({ preventDefault() {} }); },
          focus() { document.activeElement = this; }
        };
        nodes.set(id, node);
      }
      return nodes.get(id);
    }
  };
  // Disabled configuration prevents SDK loading; exercise the bound validation handlers only.
  const window = { HOPPO_CLOUD_CONFIG: testSdk ? { enabled: true, emulator: true, firebase: { apiKey: 'fake', projectId: 'demo-hoppo', appId: 'test' } } : { enabled: false } };
  const context = vm.createContext({ window, document, console, testSdk, location: { hostname: 'localhost' }, Store: { clearRemote() {} }, Settings: { syncFields() {} } });
  vm.runInContext(source.replace(/await import\('\.\/vendor\/firebase\.js\?v=\d+'\)/, 'testSdk'), context);
  const ready = window.Cloud.init();
  const node = id => document.getElementById(id);
  return { node, document, ready, cloud: window.Cloud };
}

function signup(node, password = 'test12', confirmation = password) {
  node('authRegisterTab').trigger('click');
  node('authEmail').value = 'valid.name@icloud.com'; node('authPassword').value = password;
  node('authPasswordConfirm').value = confirmation;
}

function sdkStub(patch = {}) {
  const auth = { currentUser: null }, calls = { register: 0, login: 0, mail: 0, persistence: 0 };
  let changed;
  const user = { uid: 'test-user', email: 'valid.name@icloud.com', emailVerified: false, providerData: [{ providerId: 'password' }] };
  const sdk = {
    initializeApp() {}, getAuth: () => auth, getFirestore() {}, getFunctions() {},
    connectAuthEmulator() {}, connectFirestoreEmulator() {}, connectFunctionsEmulator() {},
    onAuthStateChanged(_, fn) { changed = fn; fn(null); }, inMemoryPersistence: 'memory',
    async setPersistence() { calls.persistence++; },
    async createUserWithEmailAndPassword() { calls.register++; auth.currentUser = user; await changed(user); return { user }; },
    async signInWithEmailAndPassword() { calls.login++; auth.currentUser = user; await changed(user); return { user }; },
    async sendEmailVerification() { calls.mail++; },
    ...patch
  };
  return { sdk, auth, calls, user };
}

test('valid iCloud email and short signup password identify only the password error', () => {
  const { node, document } = setup();
  signup(node, 'short'); node('authTerms').checked = true;
  node('authForm').trigger('submit');
  assert.equal(node('authEmail').getAttribute('aria-invalid'), null);
  assert.equal(node('authPassword').getAttribute('aria-invalid'), 'true');
  assert.match(node('authPasswordError').textContent, /6文字以上/);
  assert.equal(document.activeElement, node('authPassword'));
});

test('invalid email has its own error and focus', () => {
  const { node, document } = setup();
  signup(node); node('authEmail').value = 'not-an-address';
  node('authForm').trigger('submit');
  assert.equal(node('authEmail').getAttribute('aria-invalid'), 'true');
  assert.match(node('authEmailError').textContent, /形式/);
  assert.equal(document.activeElement, node('authEmail'));
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
});

test('signup accepts matching 6-character passwords and checks consent next', () => {
  const { node } = setup();
  signup(node); node('authEmail').value = '  valid@example.test  ';
  node('authForm').trigger('submit');
  assert.equal(node('authEmail').value, 'valid@example.test');
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
  assert.equal(node('authStatus').textContent, '利用条件への同意が必要です。');
});

test('editing a password clears its stale error and updates only its character count', () => {
  const { node } = setup();
  signup(node, 'short'); node('authForm').trigger('submit');
  node('authPassword').value = 'new-password-long'; node('authPassword').trigger('input');
  assert.equal(node('authPasswordError').hidden, true);
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
  assert.equal(node('authPasswordCount').textContent, '現在17文字');
  assert.equal(node('authStatus').textContent, '');
});

test('missing or mismatched password confirmation focuses the confirmation field', async () => {
  const { node, document } = setup();
  signup(node, 'test12', ''); await node('authForm').trigger('submit');
  assert.match(node('authPasswordConfirmError').textContent, /もう一度/);
  assert.equal(document.activeElement, node('authPasswordConfirm'));
  node('authPasswordConfirm').value = 'other1'; await node('authForm').trigger('submit');
  assert.match(node('authPasswordConfirmError').textContent, /一致/);
});

test('login mode never requires signup confirmation or consent', async () => {
  const { sdk, calls } = sdkStub(); const { node, ready } = setup(sdk); await ready;
  node('authEmail').value = 'valid.name@icloud.com'; node('authPassword').value = 'old';
  await node('authForm').trigger('submit');
  assert.equal(calls.login, 1); assert.equal(calls.register, 0);
  assert.equal(node('authRegistrationFields').hidden, true);
});

test('mail failure retains the created account and offers resend with a safe error code', async () => {
  const { sdk, calls } = sdkStub({ sendEmailVerification: async () => { throw Object.assign(new Error('Do not expose raw details'), { code: 'auth/too-many-requests' }); } });
  const { node, ready, cloud } = setup(sdk); await ready;
  signup(node); node('authTerms').checked = true; await node('authForm').trigger('submit');
  assert.equal(calls.register, 1); assert.ok(cloud.user);
  assert.equal(node('authFields').hidden, true); assert.equal(node('authResendBtn').hidden, false);
  assert.match(node('authStatus').textContent, /アカウントは作成済み/);
  assert.equal(node('authErrorCode').textContent, '確認用コード：auth/too-many-requests');
  assert.equal(node('authPassword').value, ''); assert.equal(node('authPasswordConfirm').value, '');
});

test('post-creation storage failure signs in the same account once using memory persistence', async () => {
  const stub = sdkStub();
  stub.sdk.createUserWithEmailAndPassword = async () => {
    stub.calls.register++; stub.auth.currentUser = stub.user;
    throw { code: 'auth/internal-error', customData: { originalError: { name: 'QuotaExceededError' } } };
  };
  const { node, ready, cloud } = setup(stub.sdk); await ready;
  signup(node); node('authTerms').checked = true; await node('authForm').trigger('submit');
  assert.equal(stub.calls.register, 1); assert.equal(stub.calls.login, 1);
  assert.equal(stub.calls.persistence, 1); assert.equal(stub.calls.mail, 1);
  assert.ok(cloud.user); assert.equal(node('authStorageNotice').hidden, false);
});

test('double submit cannot create two accounts or send duplicate verification emails', async () => {
  const stub = sdkStub(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  const create = stub.sdk.createUserWithEmailAndPassword;
  stub.sdk.createUserWithEmailAndPassword = async (...args) => { await gate; return create(...args); };
  const { node, ready } = setup(stub.sdk); await ready;
  signup(node); node('authTerms').checked = true;
  const first = node('authForm').trigger('submit'); await node('authForm').trigger('submit');
  release(); await first;
  assert.equal(stub.calls.register, 1); assert.equal(stub.calls.mail, 1);
});

test('blank login email and blank password have distinct required-field errors', async () => {
  const { node } = setup();
  node('authForm').trigger('submit');
  assert.equal(node('authEmailError').textContent, 'メールアドレスを入力してください。');
  await Promise.resolve(); await Promise.resolve();
  node('authEmail').value = 'valid@example.test'; node('authForm').trigger('submit');
  assert.equal(node('authPasswordError').textContent, 'パスワードを入力してください。');
});

test('duplicate signup moves to login, keeps email, clears new passwords and never signs in automatically', async () => {
  const { sdk, calls } = sdkStub({ createUserWithEmailAndPassword: async () => { throw { code: 'auth/email-already-in-use' }; } });
  const { node, ready, cloud } = setup(sdk); await ready;
  signup(node, 'newpass99'); node('authTerms').checked = true;
  await node('authForm').trigger('submit');
  assert.equal(node('authEmail').value, 'valid.name@icloud.com');
  assert.equal(node('authPassword').value, ''); assert.equal(node('authPasswordConfirm').value, '');
  assert.equal(node('authLoginTab').getAttribute('aria-selected'), 'true');
  assert.equal(node('authRegistrationFields').hidden, true);
  assert.equal(node('authExistingNotice').hidden, false);
  assert.equal(node('authErrorCode').hidden, true);
  assert.equal(cloud.user, null); assert.equal(calls.login, 0); assert.equal(calls.mail, 0);
  assert.match(node('authStatus').textContent, /登録時のパスワード/);
  node('authEmail').value = 'another@example.test'; node('authEmail').trigger('input');
  assert.equal(node('authExistingNotice').hidden, true, 'a changed address must not retain the previous registration notice');
});

test('signup network errors stay in signup and are not misreported as an existing account', async () => {
  const { sdk } = sdkStub({ createUserWithEmailAndPassword: async () => { throw { code: 'auth/network-request-failed' }; } });
  const { node, ready } = setup(sdk); await ready;
  signup(node); node('authTerms').checked = true; await node('authForm').trigger('submit');
  assert.equal(node('authRegisterTab').getAttribute('aria-selected'), 'true');
  assert.equal(node('authExistingNotice').hidden, true);
  assert.equal(node('authErrorCode').textContent, '確認用コード：auth/network-request-failed');
});
