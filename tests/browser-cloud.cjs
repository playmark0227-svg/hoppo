const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const functionRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp, deleteApp } = functionRequire('firebase-admin/app');
const { getAuth } = functionRequire('firebase-admin/auth');
const config = { enabled: true, emulator: true, firebase: { apiKey: 'fake-key', projectId: 'demo-hoppo', authDomain: 'demo-hoppo.firebaseapp.com', appId: 'test-browser' }, region: 'asia-northeast1', liffId: '' };
async function main() {
  const admin = initializeApp({ projectId: 'demo-hoppo' }, 'browser-admin');
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  const errors = [], pages = [];
  async function register(label, width) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : 900 }, serviceWorkers: 'block' });
    await context.grantPermissions(['local-network-access'], { origin: 'http://127.0.0.1:8776' });
    await context.addInitScript(() => localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true }, points: 999999 })));
    await context.route('**/js/cloud-config.js*', route => route.fulfill({ contentType: 'text/javascript', body: `window.HOPPO_CLOUD_CONFIG=${JSON.stringify(config)}` }));
    // HTTP emulator endpoints are permitted in this isolated test only; production CSP stays unchanged.
    await context.route('**/index.html', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(/<meta http-equiv="Content-Security-Policy" content="[\s\S]*?">/, '') }); });
    const page = await context.newPage(); page.on('pageerror', e => { errors.push(e.message); console.error('browser error:', e.message); }); pages.push(page);
    page.on('console', message => { if (message.type() === 'error') console.error('browser console:', message.text()); });
    await page.goto('http://127.0.0.1:8776/index.html', { waitUntil: 'networkidle' });
    await page.locator('#loader').waitFor({ state: 'detached' });
    console.log(label, 'loaded');
    assert.equal(await page.evaluate(() => Store.get().points), 0, 'preview points must never migrate');
    await page.evaluate(() => UI.go('settings')); await page.locator('[data-auth-open]').first().click();
    await page.waitForFunction(() => !document.getElementById('authRegisterBtn').disabled);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.auth-card')).opacity === '1');
    const authBox = await page.locator('.auth-card').boundingBox();
    assert.ok(Math.abs(authBox.x + authBox.width / 2 - width / 2) <= 1, 'login panel must be centered');
    assert.ok(authBox.x >= 0 && authBox.x + authBox.width <= width, 'login panel must fit');
    await page.screenshot({ path: `docs/qa-production/${width === 320 ? 'small' : width === 390 ? 'mobile' : 'desktop'}-emulator-login.png` });
    console.log(label, 'auth ready');
    const email = `browser-${width}-${Date.now()}@example.test`;
    await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('password-test-12345');
    await page.locator('#authNickname').fill(label); await page.locator('#authTerms').check(); await page.locator('#authRegisterBtn').click();
    await page.waitForFunction(() => !!Cloud.user);
    console.log(label, 'registered');
    await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('送りました'));
    await getAuth(admin).updateUser((await getAuth(admin).getUserByEmail(email)).uid, { emailVerified: true });
    await page.locator('#authVerifyBtn').click(); await page.waitForFunction(() => !!Cloud.account);
    await page.waitForFunction(() => Store.get().points === 5);
    console.log(label, 'verified and cloud points loaded');
    await page.locator('#authModal [data-close]').last().click(); await page.waitForTimeout(300);
    return { context, page, email };
  }
  try {
    const small = await register('小画面確認', 320); await small.context.close();
    const a = await register('登録者A', 390), b = await register('登録者B', 1440);
    await a.page.locator('#settingsBirthday').fill('2000-01-01'); await a.page.locator('#settingsBirthday').dispatchEvent('change');
    await a.page.locator('#cloudRankingConsent').check(); await a.page.locator('#cloudDmConsent').check(); await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => Cloud.account.profile.dmEnabled);
    await b.page.evaluate(() => Cloud.call('updateProfile', { profile: { name: '登録者B', birthday: '2000-01-01', publicRanking: true, dmEnabled: true } }));
    await a.page.waitForFunction(() => Cloud.people.length === 2); await b.page.waitForFunction(() => Cloud.people.length === 2);
    for (const page of [a.page, b.page]) {
      await page.evaluate(() => { UI.go('social'); Social.openTab('ranking'); });
      await page.locator('#rankingList .live-row-actions button').filter({ hasText: /^フォロー$/ }).click();
      await page.waitForFunction(() => Cloud.following.length === 1);
    }
    await a.page.evaluate(() => Social.openTab('friends'));
    await a.page.locator('#friendList button').filter({ hasText: /^DM$/ }).click();
    const text = '<img src=x onerror=alert(1)>'; await a.page.locator('#dmInput').fill(text); await a.page.locator('#dmSendBtn').click();
    await a.page.waitForFunction(() => document.querySelector('#dmLog')?.textContent.includes('<img src=x'));
    assert.equal(await a.page.locator('#dmLog img').count(), 0);
    await b.page.waitForFunction(() => Cloud.threads.length === 1); await b.page.evaluate(() => Social.openTab('dm'));
    await b.page.locator('#dmThreadList button').first().click(); await b.page.waitForFunction(() => document.querySelector('#dmLog')?.textContent.includes('<img src=x'));
    fs.mkdirSync('docs/qa-production', { recursive: true });
    await a.page.waitForTimeout(4000);
    await a.page.screenshot({ path: 'docs/qa-production/mobile-live-dm.png' });
    await b.page.screenshot({ path: 'docs/qa-production/desktop-live-dm.png' });
    await a.context.close();
    // Persisted Firebase session must restore the same cloud account after reload, without re-consent.
    await b.page.reload({ waitUntil: 'domcontentloaded' }); await b.page.waitForFunction(() => !!Cloud.account);
    assert.equal(await b.page.evaluate(() => Cloud.account.profile.name), '登録者B');
    await b.page.evaluate(() => Cloud.open()); await b.page.locator('#authLogoutBtn').click(); await b.page.waitForFunction(() => !Cloud.user);
    assert.equal(await b.page.evaluate(() => Store.get().points), 0);
    assert.deepEqual(errors, []); console.log('Live-emulator browser: email registration/verification, profile opt-in, real-user follows/DM, escaped HTML, session restoration and logout passed.');
  } finally { await browser.close(); await deleteApp(admin); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
