const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const functionRequire = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp, deleteApp } = functionRequire('firebase-admin/app');
const { getAuth } = functionRequire('firebase-admin/auth');
const config = { enabled: true, emulator: true, firebase: { apiKey: 'fake-key', projectId: 'demo-hoppo', authDomain: 'demo-hoppo.firebaseapp.com', appId: 'test-browser' }, region: 'asia-northeast1', liffId: 'test-liff-id' };
async function main() {
  const admin = initializeApp({ projectId: 'demo-hoppo' }, 'browser-admin');
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  const errors = [], pages = [];
  const frameTest = await browser.newPage();
  await frameTest.setContent('<iframe src="http://127.0.0.1:8776/index.html"></iframe>');
  const framed = frameTest.frameLocator('iframe');
  await framed.getByRole('link', { name: '北方領土ステータスを開く', exact: true }).waitFor();
  assert.equal(await framed.locator('#authForm').count(), 0, 'embedded login controls must never be exposed for clickjacking');
  await frameTest.close();
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
    await page.locator('#authRegisterTab').click();
    await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('short');
    await page.locator('#authTerms').check(); await page.locator('#authRegisterBtn').click();
    assert.match(await page.locator('#authPasswordError').textContent(), /6文字以上/);
    assert.equal(await page.locator('#authPassword').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#authEmail').getAttribute('aria-invalid'), null, 'a valid email must not be blamed for a short password');
    assert.equal(await page.locator('#authPasswordCount').textContent(), '現在5文字');
    assert.equal(await page.evaluate(() => Cloud.user), null, 'validation must not create an account');
    await page.screenshot({ path: `docs/qa-production/${width === 320 ? 'small' : width === 390 ? 'mobile' : 'desktop'}-password-validation.png` });
    await page.locator('#authEmail').fill('invalid-address'); await page.locator('#authRegisterBtn').click();
    assert.match(await page.locator('#authEmailError').textContent(), /形式/);
    await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill('test12');
    await page.locator('#authPasswordConfirm').fill('wrong1'); await page.locator('#authRegisterBtn').click();
    assert.match(await page.locator('#authPasswordConfirmError').textContent(), /一致/);
    assert.equal(await page.evaluate(() => Cloud.user), null);
    await page.locator('#authPasswordConfirm').fill('test12');
    assert.equal(await page.locator('#authEmailError').isVisible(), false);
    assert.equal(await page.locator('#authPasswordError').isVisible(), false);
    assert.equal(await page.locator('#authPasswordConfirmError').isVisible(), false);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.auth-card')).opacity === '1');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/qa-production/${width === 320 ? 'small' : width === 390 ? 'mobile' : 'desktop'}-registration-v43.png` });
    await page.locator('#authNickname').fill(label); await page.locator('#authTerms').check(); await page.locator('#authRegisterBtn').click();
    await page.waitForFunction(() => !!Cloud.user);
    console.log(label, 'registered');
    await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('送信しました'));
    await getAuth(admin).updateUser((await getAuth(admin).getUserByEmail(email)).uid, { emailVerified: true });
    await page.locator('#authVerifyBtn').click(); await page.waitForFunction(() => !!Cloud.account);
    await page.waitForFunction(() => Store.get().points === 5);
    console.log(label, 'verified and cloud points loaded');
    assert.equal(await page.locator('#authLineLinkArea').isVisible(), true, 'verified password account must be offered LINE linking');
    assert.equal(await page.locator('#authLineLinkBtn').isVisible(), true);
    if (width === 390) await page.screenshot({ path: 'docs/qa-production/mobile-line-link-v45.png' });
    try { await page.locator('#loader').waitFor({ state: 'detached', timeout: 15000 }); }
    catch (error) { console.error('Hydration state:', await page.evaluate(() => ({ pending: Cloud.hydrationPending, loader: document.getElementById('loader')?.outerHTML.slice(-800), authStatus: document.getElementById('authStatus').textContent, account: !!Cloud.account }))); throw error; }
    await page.locator('#authModal [data-close]').last().click(); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('.account-panel').getClientRects().length), 1,
      'account panel must not be split across desktop columns');
    assert.equal(await page.locator('#accountManageBtn').textContent(), 'アカウント管理');
    assert.equal(await page.locator('#settingsImportBtn').isDisabled(), true);
    assert.equal(await page.locator('#settingsResetBtn').isDisabled(), true);
    return { context, page, email };
  }
  try {
    const small = await register('小画面確認', 320);
    await small.page.evaluate(() => {
      const realCall = Cloud.call;
      Cloud.call = (name, data) => name === 'submitQuiz'
        ? Promise.reject({ code: 'functions/not-found' }) : realCall(name, data);
      UI.go('quiz'); Quiz.refresh();
    });
    await small.page.locator('[data-quiz="entry"]').click();
    const entryAnswers = await small.page.evaluate(() => QUIZZES.find(quiz => quiz.id === 'entry').questions.map(question => question.answer));
    for (const [index, answer] of entryAnswers.entries()) {
      await small.page.locator('#quizChoices .quiz-choice').nth(answer).click();
      await small.page.locator('#quizNextBtn').click();
    }
    await small.page.waitForFunction(() => !document.getElementById('quizResult').hidden);
    await small.page.waitForFunction(() => Store.get().points > 5);
    assert.match(await small.page.locator('#quizResultScore').textContent(), new RegExp(`${entryAnswers.length} / ${entryAnswers.length}`));
    await small.context.close();
    const a = await register('登録者A', 390), b = await register('登録者B', 1440);
    await a.page.locator('#accountManageBtn').click();
    assert.equal(await a.page.locator('#authSessionActions').isVisible(), true);
    await a.page.locator('#authModal [data-close]').last().click();

    await a.page.locator('#cloudDmConsent').check();
    await a.page.locator('#cloudSaveProfile').click();
    assert.match(await a.page.locator('#cloudProfileStatus').textContent(), /ランキング公開への同意/);
    assert.equal(await a.page.locator('#cloudProfileStatus').getAttribute('data-state'), 'error');
    assert.equal(await a.page.evaluate(() => Cloud.account.profile.dmEnabled), false);
    await a.page.screenshot({ path: 'docs/qa-production/mobile-profile-save-error-v44.png' });

    await a.page.locator('#cloudRankingConsent').check();
    await a.page.locator('#cloudSaveProfile').click();
    assert.match(await a.page.locator('#cloudProfileStatus').textContent(), /18歳以上の誕生日登録/);
    assert.match(await a.page.locator('#settingsBirthdayError').textContent(), /18歳以上/);
    assert.equal(await a.page.locator('#settingsBirthday').getAttribute('aria-invalid'), 'true');
    await a.page.locator('#settingsBio').fill('四島を学んでいます');
    await a.page.locator('#settingsRegion').fill('根室市');
    await a.page.locator('#settingsBirthday').fill('2000-01-01'); await a.page.locator('#settingsBirthday').dispatchEvent('change');
    assert.equal(await a.page.locator('#settingsBirthdayError').isVisible(), false);
    assert.equal(await a.page.locator('#cloudProfileStatus').getAttribute('data-state'), 'dirty');
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => Cloud.account.profile.dmEnabled);
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'saved');
    assert.equal(await a.page.evaluate(() => Cloud.account.profile.bio), '四島を学んでいます');
    await a.page.locator('#cloudSaveProfile').click();
    assert.equal(await a.page.locator('#cloudProfileStatus').textContent(), '変更はありません。');
    await a.page.reload({ waitUntil: 'domcontentloaded' });
    await a.page.waitForFunction(() => !!Cloud.account);
    assert.equal(await a.page.locator('#settingsRegion').inputValue(), '根室市');
    assert.equal(await a.page.locator('#cloudDmConsent').isChecked(), true);

    await a.page.locator('#settingsBio').fill('保存を再試行します');
    const failProfileOnce = async route => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({ status: 400, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:8776' },
        body: JSON.stringify({ error: { status: 'FAILED_PRECONDITION', message: 'test rejection' } }) });
    };
    const profileUrl = url => url.pathname.toLowerCase().endsWith('/updateprofile');
    await a.page.route(profileUrl, failProfileOnce);
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'error');
    assert.match(await a.page.locator('#cloudProfileStatus').textContent(), /保存できませんでした/);
    await a.page.unroute(profileUrl, failProfileOnce);
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'saved');
    assert.equal(await a.page.evaluate(() => Cloud.account.profile.bio), '保存を再試行します');
    await a.page.locator('#settingsBio').fill('先に保存する内容');
    const delayProfile = async route => {
      if (route.request().method() !== 'POST') return route.continue();
      await new Promise(resolve => setTimeout(resolve, 350));
      await route.continue();
    };
    await a.page.route(profileUrl, delayProfile);
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.locator('#settingsBio').fill('保存中に追加した内容');
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').textContent.includes('追加の変更は未保存'));
    assert.equal(await a.page.locator('#settingsBio').inputValue(), '保存中に追加した内容');
    await a.page.unroute(profileUrl, delayProfile);
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'saved');
    assert.equal(await a.page.evaluate(() => Cloud.account.profile.bio), '保存中に追加した内容');
    await a.page.waitForTimeout(4000);
    await a.page.screenshot({ path: 'docs/qa-production/mobile-profile-save-success-v44.png' });

    await a.page.locator('#framePicker [data-frame="ocean"]').click();
    await a.page.locator('#patternPicker button[data-pattern="shine"]').click();
    await a.page.locator('#islandPicker [data-island="shikotan"]').click();
    assert.equal(await a.page.locator('#cloudProfileStatus').getAttribute('data-state'), 'dirty');
    await a.page.locator('#cloudSaveProfile').click();
    await a.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'saved');
    assert.deepEqual(await a.page.evaluate(() => {
      const { avatarFrame, avatarPattern, favoriteIsland } = Cloud.account.profile;
      return [avatarFrame, avatarPattern, favoriteIsland];
    }), ['ocean', 'shine', 'shikotan']);
    await a.page.locator('.settings-toggle:has(#setHighContrast)').click();
    assert.equal(await a.page.locator('#setHighContrast').isChecked(), true);
    assert.equal(await a.page.evaluate(() => document.documentElement.classList.contains('high-contrast')), true);
    const downloadPromise = a.page.waitForEvent('download');
    await a.page.locator('#settingsExportBtn').click();
    assert.match((await downloadPromise).suggestedFilename(), /^hoppou-status-.*\.json$/);
    await a.page.locator('#settingsCreditsBtn').click();
    assert.equal(await a.page.locator('#creditsModal').isVisible(), true);
    await a.page.locator('#creditsModal [data-close]').last().click();
    await a.page.reload({ waitUntil: 'domcontentloaded' });
    await a.page.waitForFunction(() => !!Cloud.account);
    assert.equal(await a.page.locator('#islandPicker [data-island="shikotan"]').getAttribute('aria-checked'), 'true');
    assert.equal(await a.page.evaluate(() => document.documentElement.classList.contains('high-contrast')), true);

    await b.page.locator('#settingsBirthday').fill('2000-01-01');
    await b.page.locator('#settingsBirthday').dispatchEvent('change');
    await b.page.locator('#cloudRankingConsent').check();
    await b.page.locator('#cloudDmConsent').check();
    await b.page.locator('#cloudSaveProfile').click();
    await b.page.waitForFunction(() => Cloud.account.profile.dmEnabled);
    await b.page.waitForFunction(() => document.querySelector('#cloudProfileStatus').dataset.state === 'saved');
    await b.page.waitForTimeout(4000);
    await b.page.screenshot({ path: 'docs/qa-production/desktop-profile-save-v44.png' });
    await b.page.evaluate(() => UI.go('shop'));
    assert.equal(await b.page.locator('#shopGrid [data-buy]:not(:disabled)').count(), 0,
      'unavailable goods exchange must not look actionable');
    await b.page.evaluate(() => UI.go('settings'));
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
    await b.page.reload({ waitUntil: 'domcontentloaded' });
    await b.page.locator('#loader').waitFor({ state: 'detached', timeout: 20000 });
    await b.page.waitForFunction(() => !!Cloud.account);
    assert.equal(await b.page.evaluate(() => Cloud.account.profile.name), '登録者B');
    await b.page.evaluate(() => { UI.go('social'); Social.openTab('dm'); });
    await b.page.locator('#dmThreadList button').first().click();
    await b.page.waitForFunction(() => document.querySelector('#dmLog')?.textContent.includes('<img src=x'));
    await b.page.locator('#dmInput').fill('送信前の個人情報');
    await b.page.evaluate(() => Cloud.open()); await b.page.locator('#authLogoutBtn').click(); await b.page.waitForFunction(() => !Cloud.user);
    assert.equal(await b.page.evaluate(() => Store.get().points), 0);
    assert.equal(await b.page.locator('#dmLog').textContent(), '', 'logout must erase rendered DM bodies');
    assert.equal(await b.page.locator('#dmInput').inputValue(), '', 'logout must erase unsent messages');
    assert.equal(await b.page.evaluate(() => Cloud.threads.length), 0);
    assert.equal(await b.page.evaluate(() => Store.getProfile().bio), '');
    assert.equal(await b.page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hoppou_'))
      .some(k => /送信前の個人情報|<img src=x|四島を学んでいます/.test(localStorage.getItem(k)))), false);
    assert.deepEqual(errors, []); console.log('Live-emulator browser: email registration/verification, profile opt-in, real-user follows/DM, escaped HTML, session restoration and logout passed.');
  } finally { await browser.close(); await deleteApp(admin); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
