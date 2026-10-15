const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const root = process.env.HOPPO_TEST_URL || 'http://127.0.0.1:8776/';

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  try {
    for (const [label, width, height] of [['small', 320, 568], ['mobile', 390, 844], ['desktop', 1440, 900], ['wide', 1920, 1080], ['landscape', 844, 390]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      const page = await context.newPage();
      // Keep the actual startup layout visible without authenticating or changing cloud data.
      await page.route('**/js/app.js*', route => route.abort());
      await page.goto(root, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const retry of [false, true]) {
        await page.evaluate(retry => {
          document.getElementById('loaderStatus').textContent = retry
            ? 'データを読み込めませんでした。通信環境を確認して再読み込みしてください。'
            : 'プロフィール・ポイント・交流データを読み込んでいます…';
          document.getElementById('loaderRetry').hidden = !retry;
        }, retry);
        for (const time of [0, 550, 1100, 1650]) {
          await page.evaluate(time => {
            document.querySelector('#loader').getAnimations({ subtree: true }).forEach(animation => {
              animation.pause(); animation.currentTime = time;
            });
          }, time);
          const boxes = await page.evaluate(() => {
            const rect = selector => {
              const r = document.querySelector(selector).getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
            };
            return {
              art: rect('.loader-art'), title: rect('.loader-title'), status: rect('.loader-status'),
              dots: rect('.loader-dots'), dot: rect('.loader-dots span'), retry: rect('.loader-retry'),
              scene: rect('.loader-scene')
            };
          });
          assert.ok(boxes.art.bottom + 10 <= boxes.title.top, `${label}: artwork/title`);
          assert.ok(boxes.title.bottom + 10 <= boxes.status.top, `${label}: title/status`);
          assert.ok(boxes.status.bottom + 10 <= boxes.dot.top, `${label}: status/animated dots`);
          if (retry) assert.ok(boxes.dots.bottom + 10 <= boxes.retry.top, `${label}: dots/retry`);
          assert.ok(boxes.scene.left >= 0 && boxes.scene.right <= width, `${label}: horizontal overflow`);
        }
        await page.screenshot({ path: path.join(os.tmpdir(), `hoppo-loader-${label}${retry ? '-retry' : ''}-v57.png`) });
      }
      await context.close();
    }
    console.log('Loader layout: 5 viewports, loading/retry states and 4 animation phases passed; 10 screenshots saved to the temporary directory.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
