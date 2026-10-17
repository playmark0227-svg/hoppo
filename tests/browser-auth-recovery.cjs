const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const adminRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp, deleteApp } = adminRequire('firebase-admin/app');
const { getAuth } = adminRequire('firebase-admin/auth');
const config = { enabled: true, emulator: true, emulatorFirestorePort: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').pop() || 8080), firebase: { apiKey: 'fake-key', projectId: 'demo-hoppo', authDomain: 'demo-hoppo.firebaseapp.com', appId: 'auth-recovery' } };

async function main() {
  const admin = initializeApp({ projectId: 'demo-hoppo' }, 'auth-recovery');
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  const errors = [];
  try {
    fs.mkdirSync('docs/qa-production', { recursive: true });
    for (const mode of ['local-quota', 'session-quota', 'mail-failure', 'duplicate-desktop', 'duplicate-small']) {
      const width = mode === 'duplicate-desktop' ? 1440 : mode === 'duplicate-small' ? 320 : 390;
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.grantPermissions(['local-network-access'], { origin: 'http://127.0.0.1:8776' });
      await context.addInitScript(blockLocal => {
        localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true } }));
        if (blockLocal) {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (this === localStorage && key.startsWith('firebase:authUser:')) throw new DOMException('Storage full', 'QuotaExceededError');
            return original.call(this, key, value);
          };
        }
      }, mode === 'local-quota');
      await context.route('**/js/cloud-config.js*', r => r.fulfill({ contentType: 'text/javascript', body: `window.HOPPO_CLOUD_CONFIG=${JSON.stringify(config)}` }));
      await context.route('**/index.html', async r => { const response = await r.fetch(); await r.fulfill({ response, body: (await response.text()).replace(/<meta http-equiv="Content-Security-Policy" content="[\s\S]*?">/, '') }); });
      if (mode === 'mail-failure') await context.route('**/accounts:sendOobCode*', r => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } }) }));
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:8776/index.html#settings');
      await page.locator('#loader').waitFor({ state: 'detached' }); await page.locator('[data-auth-open]').first().click();
      await page.waitForFunction(() => !document.getElementById('authRegisterTab').disabled);
      if (mode === 'session-quota') await page.evaluate(async () => {
        const scriptUrl = new URL(document.querySelector('script[src*="js/cloud.js"]').src);
        const sdk = await import(new URL(`vendor/firebase.js${scriptUrl.search}`, scriptUrl).href);
        await sdk.setPersistence(sdk.getAuth(), sdk.browserSessionPersistence);
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (this === sessionStorage && key.startsWith('firebase:authUser:')) throw new DOMException('Storage full', 'QuotaExceededError');
          return original.call(this, key, value);
        };
      });
      await page.locator('#authRegisterTab').click();
      const email = `auth-${mode}-${Date.now()}@example.test`;
      await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('test12');
      await page.locator('#authPasswordConfirm').fill('test12'); await page.locator('#authTerms').check();
      await page.locator('#authRegisterBtn').click(); await page.waitForFunction(() => !!Cloud.user);
      assert.ok((await getAuth(admin).getUserByEmail(email)).uid);
      assert.equal(await page.locator('#authFields').isVisible(), false);
      assert.equal(await page.locator('#authPassword').inputValue(), '');
      assert.equal(await page.locator('#authPasswordConfirm').inputValue(), '');
      if (mode === 'mail-failure') {
        await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('アカウントは作成済み'));
        assert.equal(await page.locator('#authResendBtn').isVisible(), true);
        assert.match(await page.locator('#authErrorCode').textContent(), /auth\/too-many-requests/);
        await page.screenshot({ path: 'docs/qa-production/mail-recovery-v43.png' });
        await context.unroute('**/accounts:sendOobCode*'); await page.locator('#authResendBtn').click();
      }
      await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('送信しました'));
      if (mode === 'session-quota') assert.equal(await page.locator('#authStorageNotice').isVisible(), true);
      if (mode === 'local-quota' || mode.startsWith('duplicate-')) {
        await page.locator('#authLogoutBtn').click(); await page.waitForFunction(() => !Cloud.user);
        const originalUid = (await getAuth(admin).getUserByEmail(email)).uid;
        await page.locator('#authRegisterTab').click();
        await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('newpass99');
        await page.locator('#authPasswordConfirm').fill('newpass99'); await page.locator('#authTerms').check();
        await page.locator('#authRegisterBtn').click();
        await page.waitForFunction(() => document.getElementById('authLoginTab').getAttribute('aria-selected') === 'true');
        assert.equal(await page.locator('#authExistingNotice').isVisible(), true);
        assert.equal(await page.locator('#authEmail').inputValue(), email);
        assert.equal(await page.locator('#authPassword').inputValue(), '');
        assert.equal(await page.locator('#authPasswordConfirm').isVisible(), false);
        assert.equal(await page.evaluate(() => Cloud.user), null);
        await page.waitForTimeout(300);
        await page.screenshot({ path: `docs/qa-production/duplicate-login-${width}.png` });
        await page.locator('#authResetBtn').click();
        await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('再設定メールを送信'));
        assert.equal((await getAuth(admin).getUserByEmail(email)).uid, originalUid);
        await page.locator('#authPassword').fill('newpass99'); await page.locator('#authLoginBtn').click();
        await page.waitForFunction(() => !document.getElementById('authErrorCode').hidden);
        assert.equal(await page.evaluate(() => Cloud.user), null, 'duplicate signup must never replace the original password');
        await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('test12');
        await page.locator('#authLoginBtn').click(); await page.waitForFunction(() => !!Cloud.user);
        assert.equal(await page.evaluate(() => Cloud.user.uid), originalUid);
      }
      console.log(`${mode}: signup, verification recovery and existing account safety passed`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await deleteApp(admin); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
