const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.env.HOPPO_TEST_URL || 'http://127.0.0.1:8776/';
async function main() {
  const dir = path.join(process.cwd(), 'docs/qa-production'); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  const errors = [];
  try {
    for (const [label, width, height] of [['mobile', 390, 844], ['small', 320, 740], ['desktop', 1440, 1000]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      await context.addInitScript(() => { localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true }, lastLoginDate: new Date().toISOString().slice(0, 10) })); });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(root, { waitUntil: 'networkidle' });
      await page.locator('#loader').waitFor({ state: 'detached' });
      await page.screenshot({ path: path.join(dir, `${label}-home.png`), fullPage: true });
      await page.evaluate(() => UI.go('settings'));
      await page.locator('[data-auth-open]').first().click();
      await page.locator('#authModal').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#authRegisterBtn').isDisabled(), true);
      assert.match(await page.locator('#authStatus').innerText(), /プレビュー/);
      assert.equal(await page.locator('#authLineBtn').isVisible(), false);
      await page.screenshot({ path: path.join(dir, `${label}-login.png`) });
      const box = await page.locator('.auth-card').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'login panel horizontal overflow');
      await page.locator('#authModal [data-close]').last().click();
      await page.waitForTimeout(300);
      await page.evaluate(() => UI.go('social'));
      await page.screenshot({ path: path.join(dir, `${label}-ranking.png`), fullPage: true });
      assert.equal(await page.locator('#rankingList .live-row').count(), 0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `page overflow: ${label}`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await offlineContext.addInitScript(() => localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true } })));
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(root, { waitUntil: 'networkidle' });
    await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await offlinePage.reload({ waitUntil: 'networkidle' });
    await offlineContext.setOffline(true); await offlinePage.reload({ waitUntil: 'domcontentloaded' });
    await offlinePage.waitForFunction(() => !!window.Cloud && !!window.HOPPO_CLOUD_CONFIG);
    assert.equal(await offlinePage.evaluate(() => HOPPO_CLOUD_CONFIG.enabled), false);
    await offlineContext.close();
    console.log('Preview browser checks: 3 viewports, 9 screenshots, no runtime errors or horizontal overflow.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
