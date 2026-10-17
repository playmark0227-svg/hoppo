const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const jsQR = require('jsqr');
const ar = require('node:module').createRequire(require.resolve('../functions/package.json'));
const { initializeApp, deleteApp } = ar('firebase-admin/app');
const { getAuth } = ar('firebase-admin/auth');
const { getFirestore } = ar('firebase-admin/firestore');
const P = require('../functions/policy.cjs');
const config = { enabled: true, emulator: true, emulatorFirestorePort: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').pop() || 8080), firebase: { apiKey: 'fake-key', projectId: 'demo-hoppo', authDomain: 'demo-hoppo.firebaseapp.com', appId: 'admin-browser' }, region: 'asia-northeast1' };
const origin = 'http://127.0.0.1:8776';
const shots = path.join(os.tmpdir(), 'hoppo-admin-qa'); fs.mkdirSync(shots, { recursive: true });
async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-hoppo', 'This test must never access production');
  const admin = initializeApp({ projectId: 'demo-hoppo' }, 'browser-content'); const db = getFirestore(admin);
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  const errors = [], contexts = [];
  async function login(label, width, role) {
    const email = `content-${role ? 'admin' : 'member'}-${Date.now()}@example.test`, password = 'admin-test-password';
    const user = await getAuth(admin).createUser({ email, password, emailVerified: true });
    await db.doc(`users/${user.uid}`).set({ profile: P.profile({ name: label }), termsVersion: P.VERSION,
      createdAt: new Date().toISOString(), consentAt: new Date().toISOString(), points: 0, totalEarned: 0,
      history: [], quizResults: {}, stamps: {}, usedQrCodes: [], lastLoginDate: '', loginStreak: 0, longestStreak: 0, loginTotal: 0 });
    if (role) await db.doc(`admins/${user.uid}`).set({ enabled: true });
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' }); contexts.push(context);
    await context.grantPermissions(['local-network-access'], { origin });
    await context.addInitScript(() => localStorage.setItem('hoppou_device_v2', JSON.stringify({ flags: { tutorialSeen: true }, settings: { reduceMotion: true } })));
    await context.route('**/js/cloud-config.js*', route => route.fulfill({ contentType: 'text/javascript', body: `window.HOPPO_CLOUD_CONFIG=${JSON.stringify(config)}` }));
    await context.route('**/index.html', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace(/<meta http-equiv="Content-Security-Policy" content="[\s\S]*?">/, '') }); });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(`${origin}/index.html#settings`); await page.locator('#loader').waitFor({ state: 'detached' });
    await page.locator('[data-auth-open]').first().click(); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.waitForFunction(() => !document.getElementById('authLoginBtn').disabled);
    await page.locator('#authLoginBtn').click(); await page.waitForFunction(() => !!Cloud.account);
    await page.locator('#loader').waitFor({ state: 'detached' });
    await page.locator('#authModal [data-close]').last().click(); await page.waitForTimeout(350);
    console.log('Logged in:', label, 'admin:', role);
    return { page, context, uid: user.uid };
  }
  async function saved(page, pattern) { await page.locator('#adminStatus').filter({ hasText: pattern }).waitFor(); }
  async function tab(page, name) { await page.getByRole('tab', { name, exact: true }).click(); }
  async function fit(page, label) {
    await page.waitForTimeout(450);
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) console.log('Overflow:', label, await page.evaluate(() => [...document.querySelectorAll('body *')].filter(n => n.getClientRects().length && n.getBoundingClientRect().right > innerWidth + 1).map(n => ({ tag: n.tagName, cl: n.className?.baseVal || n.className, w: n.getBoundingClientRect().width, right: n.getBoundingClientRect().right })).slice(0, 20)));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: document overflow`);
    const bad = await page.locator('#adminRoot input:not([type=radio]):not([type=checkbox]), #adminRoot textarea, #adminRoot select').evaluateAll(nodes => nodes.filter(node => {
      if (!node.getClientRects().length) return false; const r = node.getBoundingClientRect(); return r.x < -1 || r.right > innerWidth + 1;
    }).map(node => node.name)); assert.deepEqual(bad, [], `${label}: clipped fields`);
  }
  try {
    const owner = await login('運営テスト', 1440, true), member = await login('参加者テスト', 390, false), page = owner.page;
    await page.locator('#adminEntry').waitFor(); await page.locator('#adminEntry').click();
    await page.getByRole('tab', { name: 'スタンプ', exact: true }).waitFor();
    await member.page.evaluate(() => UI.go('admin'));
    await member.page.getByText('このアカウントには管理者権限がありません。', { exact: true }).waitFor();
    assert.equal(await member.page.locator('#adminEntry').isVisible(), false);
    await tab(page, 'スタンプ'); await page.getByRole('button', { name: '新規追加', exact: true }).click();
    const stampId = await page.locator('#adminEditForm [name=id]').inputValue();
    const form = page.locator('#adminEditForm');
    await form.locator('[name=name]').fill('納沙布岬 学習スポット'); await form.locator('[name=area]').fill('根室市 納沙布岬');
    await form.locator('[name=address]').fill('北海道根室市納沙布'); await form.locator('[name=hint]').fill('四島を望む展望スポット。案内所のQRを探してください。');
    await form.locator('[name=body]').fill('北方四島について学べる学習スポットです。'); await form.locator('[name=lat]').fill('43.385'); await form.locator('[name=lng]').fill('145.817');
    await form.locator('[name=image]').fill('assets/images/hoppou/cape-nosappu.jpg');
    await form.locator('.admin-image-preview').waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('.admin-image-preview'); return img?.complete && img.naturalWidth > 0; });
    assert.ok(await page.locator('#adminImageOptions option').count() > 0, 'existing images must be selectable without knowing their paths');
    await form.locator('[name=facts]').fill('エリア｜根室市\n種別｜学習施設');
    await form.getByRole('button', { name: '下書き保存', exact: true }).click(); await saved(page, /下書きを保存しました/);
    assert.ok(!(await db.doc('content/catalog').get()).data().stamps.some(s => s.id === stampId));
    await page.evaluate(() => window.scrollTo(0, 0)); await fit(page, 'desktop stamp');
    await page.screenshot({ path: path.join(shots, 'desktop-stamp-editor.png'), fullPage: true });
    await form.getByRole('button', { name: '公開', exact: true }).click(); await saved(page, /公開しました/);
    await member.page.evaluate(() => UI.go('stamps'));
    await member.page.locator(`[data-stamp="${stampId}"]`).click();
    assert.match(await member.page.locator('#stampFacts').textContent(), /案内所のQR/);
    assert.match(await member.page.locator('#stampMapLink').getAttribute('href'), /43.385,145.817/);
    await member.page.locator('#stampModal [data-close]').last().click(); await member.page.waitForTimeout(300);
    await tab(page, 'イベントQR');
    await page.locator('#adminQRForm [name=label]').fill('納沙布岬 学習参加');
    await page.locator('#adminQRForm [name=stampId]').selectOption(stampId);
    await page.locator('#adminQRForm [name=points]').fill('100');
    await page.locator('#adminQRForm').getByRole('button', { name: 'QRコードを発行', exact: true }).click();
    await saved(page, /QRコードを発行しました/); await page.locator('#adminQRPanel img').waitFor();
    const code = await page.locator('#adminQRPanel code').textContent(); assert.match(code, /^HOPPO:/);
    const download = page.waitForEvent('download'); await page.locator('#adminQRPanel').getByRole('button', { name: '画像保存', exact: true }).click();
    const file = await download, png = path.join(shots, 'issued-qr.png'); await file.saveAs(png);
    const { data: pixels, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(jsQR(new Uint8ClampedArray(pixels), info.width, info.height).data, code, 'downloaded PNG must encode the exact server code');
    await page.evaluate(() => window.scrollTo(0, 0)); await fit(page, 'desktop QR');
    await page.screenshot({ path: path.join(shots, 'desktop-qr.png'), fullPage: true });
    await member.page.evaluate(() => UI.go('qr')); await member.page.locator('.qr-manual summary').click(); await member.page.locator('#qrManualInput').fill(code);
    await member.page.locator('#qrManualBtn').click();
    await member.page.waitForFunction(id => !!Store.get().stamps[id], stampId);
    assert.equal((await db.doc(`users/${member.uid}`).get()).data().points, 105);
    await member.page.evaluate(id => { UI.go('stamps'); Stamps.showDetail(id); }, stampId);
    await member.page.locator('#stampModalTitle').filter({ hasText: '納沙布岬 学習スポット' }).waitFor();
    assert.match(await member.page.locator('#stampBody').textContent(), /北方四島について学べる/);
    await member.page.waitForFunction(() => getComputedStyle(document.querySelector('#stampModal .modal-card')).opacity === '1');
    await member.page.waitForTimeout(4500);
    await member.page.screenshot({ path: path.join(shots, 'mobile-stamp-earned.png') });
    await member.page.locator('#stampModal [data-close]').last().click();
    await tab(page, 'クイズ'); await page.getByRole('button', { name: '新規追加', exact: true }).click();
    const quizId = await form.locator('[name=id]').inputValue();
    await form.locator('[name=title]').fill('管理画面テスト：四島の基礎'); await form.locator('[name=desc]').fill('政府資料を参照した公開テスト');
    await form.getByRole('button', { name: '設問を追加', exact: true }).click();
    await form.locator('[name=q]').fill('北方領土に含まれる島はどれですか？');
    await form.locator('[name=explain]').fill('日本政府は歯舞群島・色丹島・国後島・択捉島を北方領土としています。');
    await form.locator('[name=sourceTitle]').fill('外務省 北方領土問題'); await form.locator('[name=sourceUrl]').fill('https://www.mofa.go.jp/mofaj/area/hoppo/');
    for (const [i, text] of ['色丹島', '利尻島', '礼文島', '奥尻島'].entries()) await form.locator('.admin-choice input[type=text]').nth(i).fill(text);
    await form.getByRole('button', { name: '下書き保存', exact: true }).click(); await saved(page, /下書きを保存しました/);
    await form.getByRole('button', { name: '公開', exact: true }).click(); await saved(page, /政府出典の内容確認にチェック/);
    await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await fit(page, 'mobile quiz');
    await page.screenshot({ path: path.join(shots, 'mobile-quiz-editor.png'), fullPage: true });
    await page.setViewportSize({ width: 320, height: 740 }); await fit(page, 'small quiz');
    await page.screenshot({ path: path.join(shots, 'small-quiz-editor.png'), fullPage: true });
    await form.locator('#adminQuizReviewed').check(); await form.getByRole('button', { name: '公開', exact: true }).click(); await saved(page, /公開しました/);
    await member.page.evaluate(() => { UI.go('quiz'); Quiz.refresh(); });
    await member.page.locator(`[data-quiz="${quizId}"]`).click();
    await member.page.locator('#quizChoices .quiz-choice').first().click(); await member.page.locator('#quizNextBtn').click();
    await member.page.locator('#quizResultScore').filter({ hasText: '1 / 1' }).waitFor();
    await member.page.waitForFunction(() => Store.get().points === 165);
    await page.reload(); await page.locator('#loader').waitFor({ state: 'detached' });
    await page.getByRole('tab', { name: 'クイズ', exact: true }).waitFor();
    await page.getByRole('button', { name: /管理画面テスト：四島の基礎/ }).click();
    await form.getByRole('button', { name: '公開停止・削除', exact: true }).click(); await saved(page, /公開を停止しました/);
    await member.page.waitForFunction(id => !window.QUIZZES.some(q => q.id === id), quizId);
    assert.ok(Object.values((await db.doc(`users/${member.uid}`).get()).data().quizResults).some(r => r.quizId === quizId));
    await member.page.evaluate(() => {
      window.QUIZZES = []; window.STAMPS = []; window.SHOP_ITEMS = []; window.NEMURO_FURUSATO = [];
      Quiz.back(); Quiz.refresh(); Stamps.refresh(); Shop.refresh(); Shop.renderFurusato();
    });
    assert.match(await member.page.locator('#quizList').textContent(), /公開中のクイズはありません/);
    assert.match(await member.page.locator('#stampGrid').textContent(), /配布中のスタンプはありません/);
    assert.match(await member.page.locator('#shopGrid').textContent(), /掲載中の商品はありません/);
    assert.match(await member.page.locator('#furusatoGrid').textContent(), /返礼品情報はありません/);
    await page.evaluate(() => UI.go('settings')); await page.locator('#accountManageBtn').click(); await page.locator('#authLogoutBtn').click();
    await page.waitForFunction(() => !Cloud.user); await page.evaluate(() => UI.go('admin'));
    await page.getByText('管理者アカウントでログインしてください。', { exact: true }).waitFor();
    assert.equal(await page.locator('#adminEditForm').count(), 0, 'logout must clear the admin DOM');
    assert.deepEqual(errors, []); console.log(`Admin browser: draft/public workflow, QR PNG decoding, user claim, quiz scoring, mobile layouts and isolation passed. Screenshots: ${shots}`);
  } finally {
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) {
      await page.screenshot({ path: path.join(shots, `last-${index}.png`) }).catch(() => {});
      console.log('Last screen:', index, await page.locator('#adminRoot').textContent({ timeout: 1000 }).then(s => s.slice(0, 100)).catch(() => ''), await page.locator('#authStatus').textContent({ timeout: 1000 }).catch(() => ''));
    }
    await browser.close();
    for (const collection of ['content', 'adminContent', 'admins', 'adminAudit', 'adminEventSecrets', 'adminOperations', 'adminLimits']) await db.recursiveDelete(db.collection(collection));
    await deleteApp(admin);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
