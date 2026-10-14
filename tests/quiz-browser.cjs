const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.HOPPO_TEST_URL || 'http://127.0.0.1:8776/';
const output = process.env.HOPPO_SCREENSHOT_DIR || '/tmp/hoppo-quiz-qa';

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    ...(process.env.HOPPO_CHROMIUM_PATH ? { executablePath: process.env.HOPPO_CHROMIUM_PATH } : {}) });
  try {
    for (const [label, width, height] of [['small', 320, 740], ['mobile', 390, 844], ['desktop', 1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      await context.addInitScript(() => {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        localStorage.setItem('hoppou_status_v1', JSON.stringify({ flags: { tutorialSeen: true },
          lastLoginDate: date }));
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/js/cloud-config.js?v=48', route => route.fulfill({
        contentType: 'application/javascript', body: 'window.HOPPO_CLOUD_CONFIG = { enabled: false };'
      }));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('#loader').waitFor({ state: 'detached' });
      if (await page.locator('#welcomeModal').isVisible()) {
        await page.locator('#welcomeCloseBtn').click();
        await page.locator('#welcomeModal').waitFor({ state: 'hidden' });
      }
      await page.evaluate(() => { UI.go('quiz'); Quiz.refresh(); });
      assert.equal(await page.locator('#quizList .quiz-item').count(), 12, label);
      assert.equal(await page.evaluate(() => QUIZZES.reduce((sum, quiz) => sum + quiz.questions.length, 0)), 100);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(output, `${label}-quiz-list.png`), fullPage: true });
      await page.locator('[data-quiz="entry"]').click();
      assert.match(await page.locator('#quizQuestion').innerText(), /択捉島/);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.bottom-nav')).display), 'none');
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(output, `${label}-quiz-play.png`), fullPage: true });
      await page.locator('#quizChoices .quiz-choice').first().click();
      await page.locator('#quizFeedback .quiz-source-link').waitFor({ state: 'visible' });
      assert.match(await page.locator('#quizFeedback .quiz-source-link').getAttribute('href'), /^https:\/\/www8\.cao\.go\.jp/);
      await page.screenshot({ path: path.join(output, `${label}-quiz-answer.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label} overflow`);
      assert.deepEqual(errors, [], `${label} runtime errors`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`Quiz browser checks passed: 3 viewports, 100 questions, source links. Screenshots: ${output}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
