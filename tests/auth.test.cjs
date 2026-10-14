const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/cloud.js'), 'utf8');

function setup() {
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
          trigger(name) { handlers.get(name)?.({ preventDefault() {} }); },
          focus() { document.activeElement = this; }
        };
        nodes.set(id, node);
      }
      return nodes.get(id);
    }
  };
  // Disabled configuration prevents SDK loading; exercise the bound validation handlers only.
  const window = { HOPPO_CLOUD_CONFIG: { enabled: false } };
  const context = vm.createContext({ window, document, console });
  vm.runInContext(source, context); window.Cloud.init();
  const node = id => document.getElementById(id);
  return { node, document };
}

test('valid iCloud email and short signup password identify only the password error', () => {
  const { node, document } = setup();
  node('authEmail').value = 'valid.name@icloud.com'; node('authPassword').value = 'shortpass'; node('authTerms').checked = true;
  node('authRegisterBtn').trigger('click');
  assert.equal(node('authEmail').getAttribute('aria-invalid'), null);
  assert.equal(node('authPassword').getAttribute('aria-invalid'), 'true');
  assert.match(node('authPasswordError').textContent, /12文字以上/);
  assert.equal(document.activeElement, node('authPassword'));
});

test('invalid email has its own error and focus', () => {
  const { node, document } = setup();
  node('authEmail').value = 'not-an-address'; node('authPassword').value = 'test-password-long';
  node('authRegisterBtn').trigger('click');
  assert.equal(node('authEmail').getAttribute('aria-invalid'), 'true');
  assert.match(node('authEmailError').textContent, /形式/);
  assert.equal(document.activeElement, node('authEmail'));
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
});

test('signup accepts 12-character passwords through validation and checks consent next', () => {
  const { node } = setup();
  node('authEmail').value = '  valid@example.test  '; node('authPassword').value = '123456789012';
  node('authRegisterBtn').trigger('click');
  assert.equal(node('authEmail').value, 'valid@example.test');
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
  assert.equal(node('authStatus').textContent, '利用条件への同意が必要です。');
});

test('editing a password clears its stale error and updates only its character count', () => {
  const { node } = setup();
  node('authEmail').value = 'valid@example.test'; node('authPassword').value = 'shortpass';
  node('authRegisterBtn').trigger('click');
  node('authPassword').value = 'new-password-long'; node('authPassword').trigger('input');
  assert.equal(node('authPasswordError').hidden, true);
  assert.equal(node('authPassword').getAttribute('aria-invalid'), null);
  assert.equal(node('authPasswordCount').textContent, '現在17文字');
  assert.equal(node('authStatus').textContent, '');
});

test('blank login email and blank password have distinct required-field errors', async () => {
  const { node } = setup();
  node('authForm').trigger('submit');
  assert.equal(node('authEmailError').textContent, 'メールアドレスを入力してください。');
  await Promise.resolve(); await Promise.resolve();
  node('authEmail').value = 'valid@example.test'; node('authForm').trigger('submit');
  assert.equal(node('authPasswordError').textContent, 'パスワードを入力してください。');
});
