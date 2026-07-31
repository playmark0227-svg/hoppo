// Capture screenshots of all main screens.
// Serve the repo root first, then run:  node capture-screenshots.js
//   python3 -m http.server 8765 --bind 127.0.0.1
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'screenshots');
const URL = process.env.HOPPO_URL || 'http://127.0.0.1:8765/';
// Chromium bundled with Playwright, or set CHROMIUM_PATH to override.
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('  ✓', `${name}.png`);
}

async function nav(page, route, settle = 700) {
  await page.evaluate((r) => {
    window.UI.go(r);
    window.scrollTo(0, 0);
  }, route);
  await sleep(settle);
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.modal-layer, .tut-overlay').forEach(m => {
      m.classList.remove('show');
      m.hidden = true;
    });
    document.body.classList.remove('no-scroll');
  });
  await sleep(300);
}

async function seedState(page) {
  // Add some points so the shop shows a mix of can-buy / can't-buy
  await page.evaluate(() => {
    window.Store.spendPoints(window.Store.get().points, { type: 'seed', label: 'reset' });
    window.Store.addPoints(200, { type: 'seed', label: 'seed' });
    window.UI.refreshHeader();
    window.UI.refreshHome();
  });
  await sleep(300);
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});

  // ===== Mobile =====
  console.log('— Mobile —');
  let ctx = await browser.newContext({
    viewport: MOBILE, deviceScaleFactor: 2, serviceWorkers: 'block',
  });
  let page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800);            // let the loader fade and the tutorial mount
  await dismissOverlays(page);
  await seedState(page);

  await nav(page, 'home');
  await shot(page, '01-mobile-home');

  await nav(page, 'quiz');
  await shot(page, '02-mobile-quiz-list');

  await page.evaluate(() => {
    const card = document.querySelector('[data-quiz="basics"]');
    if (card) card.click();
  });
  await sleep(800);
  await shot(page, '03-mobile-quiz-play');

  await nav(page, 'quiz');

  await nav(page, 'qr');
  await shot(page, '04-mobile-qr');

  await nav(page, 'shop');
  await shot(page, '05-mobile-shop-points');

  await page.evaluate(() => document.querySelector('[data-shop-tab="furusato"]').click());
  await sleep(600);
  await shot(page, '06-mobile-shop-furusato');

  await nav(page, 'license', 800);
  await shot(page, '07-mobile-license');

  await nav(page, 'settings');
  await shot(page, '08-mobile-settings-top');

  await page.evaluate(() => window.scrollTo(0, 750));
  await sleep(400);
  await shot(page, '09-mobile-settings-avatar');

  await nav(page, 'home', 500);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.UI.showIsland('etorofu');
  });
  await sleep(700);
  await shot(page, '10-mobile-island-modal');

  await dismissOverlays(page);

  await page.evaluate(() => window.UI.showHistory());
  await sleep(700);
  await shot(page, '11-mobile-history-modal');

  await ctx.close();

  // ===== Desktop =====
  console.log('— Desktop —');
  ctx = await browser.newContext({
    viewport: DESKTOP, deviceScaleFactor: 1, serviceWorkers: 'block',
  });
  page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
  await sleep(1800);
  await dismissOverlays(page);
  await seedState(page);

  await nav(page, 'home');
  await shot(page, '12-desktop-home');

  await nav(page, 'quiz');
  await shot(page, '13-desktop-quiz-list');

  await nav(page, 'shop');
  await shot(page, '14-desktop-shop-points');

  await page.evaluate(() => document.querySelector('[data-shop-tab="furusato"]').click());
  await sleep(600);
  await shot(page, '15-desktop-shop-furusato');

  await nav(page, 'license', 800);
  await shot(page, '16-desktop-license');

  await nav(page, 'settings');
  await shot(page, '17-desktop-settings');

  await ctx.close();
  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
