const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('js/data.js', 'utf8'), context);
fs.writeFileSync('functions/catalog.json', JSON.stringify({ version: '2026-10-14', stampIds: context.window.STAMPS.map(stamp => stamp.id),
  quizzes: context.window.QUIZZES.map(({ id, title, questions }) => ({ id, title, questions })) }, null, 2) + '\n');
