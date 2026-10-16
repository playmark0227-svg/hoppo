const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = { window: {} };
for (const name of ['data.js', 'quiz-extra.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', name), 'utf8'), context);
}
const { QUIZ_CATALOG_VERSION: version, QUIZ_SOURCES: sources, QUIZZES, STAMPS } = context.window;
if (!version || !sources || QUIZZES.some(quiz => quiz.questions.some(q => !sources[q.source]))) {
  throw new Error('Quiz catalog has a missing version or an invalid government source');
}
const catalog = { version, stampIds: STAMPS.map(stamp => stamp.id), sources,
  quizzes: QUIZZES.map(({ id, title, level, questions }) => ({ id, title, level, questions })) };
const output = JSON.stringify(catalog, null, 2) + '\n';
const destination = path.join(root, 'functions', 'catalog.json');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    throw new Error('functions/catalog.json is out of sync; run npm run sync:quizzes');
  }
  console.log(`Catalog in sync: ${QUIZZES.length} sets, ${QUIZZES.reduce((sum, q) => sum + q.questions.length, 0)} questions`);
} else {
  fs.writeFileSync(destination, output);
  console.log(`Catalog generated: ${QUIZZES.length} sets, ${QUIZZES.reduce((sum, q) => sum + q.questions.length, 0)} questions`);
}
const seed = { version, revision: 1, sources,
  quizzes: QUIZZES.map((quiz, order) => ({ ...quiz, version, order })),
  stamps: STAMPS.map((stamp, order) => ({ ...stamp, hint: stamp.desc, order })),
  shop: context.window.SHOP_ITEMS.map((item, order) => ({ ...item, order })),
  furusato: context.window.NEMURO_FURUSATO.map((item, order) => ({ ...item, order })),
  islands: context.window.ISLANDS.map((item, order) => ({ ...item, order })),
  ranks: context.window.RANKS.map((item, order) => ({ ...item, order })),
  notices: [
    { id: 'daily', name: 'ログインボーナス', body: '毎日ログインで5pt。連続ログインで最大15ptまでアップします。', order: 0 },
    { id: 'quiz-update', name: 'クイズ', body: '新しいクイズが追加されました。', order: 1 },
    { id: 'event', name: 'イベント', body: 'イベント会場のQRコードを探してみましょう。', order: 2 }
  ] };
const seedPath = path.join(root, 'functions', 'content-seed.json');
const seedOutput = JSON.stringify(seed, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(seedPath) || fs.readFileSync(seedPath, 'utf8') !== seedOutput) throw new Error('Content seed is out of sync; run npm run sync:quizzes');
} else fs.writeFileSync(seedPath, seedOutput);
