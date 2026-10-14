const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.HOPPO_TEST_URL || 'https://hoppo-status.vifight.com/';
const output = path.join(process.cwd(), 'docs/qa-production');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {})
  });
  try {
    for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1440, 960]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      await context.addInitScript(() => {
        localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true } }));
      });
      const page = await context.newPage();
      const pageErrors = [];
      const failedRequests = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response.status(), 200, `${name}: page HTTP status`);
      try {
        await page.locator('#loader').waitFor({ state: 'detached', timeout: 15000 });
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${name}-public-load-error-v45.png`) });
        console.error('Runtime errors:', pageErrors);
        console.error('Failed requests:', failedRequests);
        console.error('Script state:', await page.evaluate(() => ({ app: !!window.App, cloud: !!window.Cloud, ready: document.readyState })));
        throw error;
      }
      await page.screenshot({ path: path.join(output, `${name}-public-home-v45.png`) });
      await page.evaluate(() => UI.go('settings'));
      await page.locator('[data-auth-open]').first().click();
      await page.locator('#authModal').waitFor({ state: 'visible' });
      await page.waitForTimeout(1500);
      assert.equal(await page.locator('#authLineBtn').isVisible(), true, `${name}: LINE login button`);
      assert.equal(await page.locator('#authLoginBtn').isVisible(), true, `${name}: email login button`);
      assert.equal(await page.locator('#authLineLinkArea').isVisible(), false, `${name}: link area before sign-in`);
      assert.equal(await page.evaluate(() => HOPPO_CLOUD_CONFIG.liffId), '2012022040-tYo7QPPo');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${name}: horizontal overflow`);
      const panel = await page.locator('.auth-card').boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1, `${name}: modal overflow`);
      await page.screenshot({ path: path.join(output, `${name}-public-login-v45.png`) });
      assert.deepEqual(pageErrors, [], `${name}: runtime errors`);
      const signInReady = await page.locator('#authLineBtn').isEnabled();
      const authStatus = await page.locator('#authStatus').innerText();
      console.log(`${name}: 200, LINE and email login shown, no overflow or runtime errors; sign-in ${signInReady ? 'enabled' : 'blocked'} (${authStatus})`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
