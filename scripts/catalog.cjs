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
