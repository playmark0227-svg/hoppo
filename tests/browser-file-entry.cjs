const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  try {
    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small', 320, 568]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const accountRequests = [], errors = [];
      page.on('request', request => { if (/firebaseappcheck|cloudfunctions|identitytoolkit|securetoken/.test(request.url())) accountRequests.push(request.url()); });
      page.on('pageerror', error => errors.push(error.message));
      const url = pathToFileURL(path.resolve('index.html')).href;
      await page.goto(`${url}#settings`);
      await page.getByRole('heading', { name: '北方領土ステータス', exact: true }).waitFor();
      const link = page.getByRole('link', { name: '公開サイトを開く', exact: true });
      assert.equal(await link.getAttribute('href'), 'https://hoppo-status.vifight.com/#settings');
      assert.equal(await page.locator('#loader').count(), 0, 'file pages must not show a misleading account-loading error');
      assert.equal(await page.locator('#authModal').count(), 0, 'file pages must not offer an unusable login');
      assert.equal(await page.locator('.file-entry img').evaluate(img => img.complete && img.naturalWidth > 0), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);
      const box = await page.locator('.file-entry').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= height, `${label}: content must fit`);
      await page.screenshot({ path: path.join(os.tmpdir(), `hoppo-file-entry-${label}.png`) });
      await page.goto(`${url}#unrecognized`);
      await page.reload();
      await link.waitFor(); assert.equal(await link.getAttribute('href'), 'https://hoppo-status.vifight.com/#home');
      assert.deepEqual(accountRequests, [], 'file entry must not attempt Firebase authentication or data loading');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('File entry: 3 viewports, safe public links, visible artwork and zero account requests passed.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
