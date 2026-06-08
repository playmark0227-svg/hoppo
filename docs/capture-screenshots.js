// Capture screenshots of all main screens via Puppeteer
// Run: node capture-screenshots.js
const path = require('path');
const fs = require('fs');
const puppeteer = require('/opt/homebrew/lib/node_modules/puppeteer');

const OUT = path.join(__dirname, 'screenshots');
const URL = 'http://localhost:8765/';

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1280, height: 800, deviceScaleFactor: 1 };

async function shot(page, name, options = {}) {
  const filePath = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: options.full || false });
  console.log('  ✓', `${name}.png`);
}

async function nav(page, route, settle = 700) {
  await page.evaluate((r) => {
    window.UI.go(r);
    window.scrollTo(0, 0);
  }, route);
  await new Promise(r => setTimeout(r, settle));
}

async function seedState(page) {
  // Add some points so shop shows mix of can-buy / can't-buy
  await page.evaluate(() => {
    window.Store.spendPoints(window.Store.get().points, { type:'seed', label:'reset' });
    window.Store.addPoints(200, { type:'seed', label:'seed' });
    window.UI.refreshHeader();
    window.UI.refreshHome();
  });
  await new Promise(r => setTimeout(r, 300));
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });

  // ===== Mobile screenshots =====
  console.log('— Mobile —');
  const page = await browser.newPage();
  await page.setViewport(MOBILE);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  // Wait for loader to fade
  await new Promise(r => setTimeout(r, 1500));
  // Dismiss any welcome modal
  await page.evaluate(() => {
    document.querySelectorAll('.modal-layer.show').forEach(m => {
      m.classList.remove('show');
      m.hidden = true;
    });
    document.body.classList.remove('no-scroll');
  });
  await seedState(page);

  // Home
  await nav(page, 'home');
  await shot(page, '01-mobile-home');

  // Quiz list
  await nav(page, 'quiz');
  await shot(page, '02-mobile-quiz-list');

  // Quiz playing (click first quiz)
  await page.evaluate(() => {
    const card = document.querySelector('[data-quiz="basics"]');
    if (card) card.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await shot(page, '03-mobile-quiz-play');

  // Back to quiz list
  await nav(page, 'quiz');

  // QR page
  await nav(page, 'qr');
  await shot(page, '04-mobile-qr');

  // Shop — point tab
  await nav(page, 'shop');
  await shot(page, '05-mobile-shop-points');

  // Shop — furusato tab
  await page.evaluate(() => {
    document.querySelector('[data-shop-tab="furusato"]').click();
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '06-mobile-shop-furusato');

  // License
  await nav(page, 'license');
  await new Promise(r => setTimeout(r, 800));
  await shot(page, '07-mobile-license');

  // Settings
  await nav(page, 'settings');
  await shot(page, '08-mobile-settings-top');

  // Settings scrolled to avatar upload
  await page.evaluate(() => window.scrollTo(0, 750));
  await new Promise(r => setTimeout(r, 400));
  await shot(page, '09-mobile-settings-avatar');

  // Island modal
  await nav(page, 'home');
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.UI.showIsland('etorofu');
  });
  await new Promise(r => setTimeout(r, 700));
  await shot(page, '10-mobile-island-modal');

  // Close island modal
  await page.evaluate(() => {
    document.querySelectorAll('.modal-layer').forEach(m => { m.classList.remove('show'); m.hidden = true; });
    document.body.classList.remove('no-scroll');
  });
  await new Promise(r => setTimeout(r, 300));

  // History modal
  await page.evaluate(() => window.UI.showHistory());
  await new Promise(r => setTimeout(r, 700));
  await shot(page, '11-mobile-history-modal');

  // Close
  await page.evaluate(() => {
    document.querySelectorAll('.modal-layer').forEach(m => { m.classList.remove('show'); m.hidden = true; });
    document.body.classList.remove('no-scroll');
  });

  // ===== Desktop screenshots =====
  console.log('— Desktop —');
  await page.setViewport(DESKTOP);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    document.querySelectorAll('.modal-layer.show').forEach(m => {
      m.classList.remove('show');
      m.hidden = true;
    });
    document.body.classList.remove('no-scroll');
  });
  await seedState(page);

  // Home
  await nav(page, 'home');
  await shot(page, '12-desktop-home');

  // Quiz
  await nav(page, 'quiz');
  await shot(page, '13-desktop-quiz-list');

  // Shop — point + furusato (one shot each)
  await nav(page, 'shop');
  await shot(page, '14-desktop-shop-points');

  await page.evaluate(() => { document.querySelector('[data-shop-tab="furusato"]').click(); });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, '15-desktop-shop-furusato');

  // License
  await nav(page, 'license');
  await new Promise(r => setTimeout(r, 800));
  await shot(page, '16-desktop-license');

  // Settings
  await nav(page, 'settings');
  await shot(page, '17-desktop-settings');

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
