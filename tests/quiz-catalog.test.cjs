const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = { window: {} };
for (const file of ['data.js', 'quiz-extra.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
}
const client = context.window;
const server = require('../functions/catalog.json');
const plain = value => JSON.parse(JSON.stringify(value));

test('client and server use the same 100-question edition', () => {
  assert.equal(client.QUIZ_CATALOG_VERSION, server.version);
  assert.equal(client.QUIZZES.length, 12);
  assert.equal(client.QUIZZES.reduce((sum, quiz) => sum + quiz.questions.length, 0), 100);
  assert.deepEqual(plain(client.QUIZ_SOURCES), server.sources);
  assert.deepEqual(plain(client.QUIZZES.map(({ id, title, level, questions }) => ({ id, title, level, questions }))), server.quizzes);
});

test('every question has one valid answer and a Japanese government source', () => {
  const questions = server.quizzes.flatMap(quiz => quiz.questions);
  assert.equal(new Set(server.quizzes.map(quiz => quiz.id)).size, server.quizzes.length);
  assert.equal(new Set(questions.map(question => question.q)).size, questions.length);
  for (const quiz of server.quizzes) {
    assert.ok(['入門', '初級', '中級', '上級', '超難問'].includes(quiz.level), quiz.id);
    assert.ok(quiz.questions.length >= 6 && quiz.questions.length <= 10, quiz.id);
  }
  for (const question of questions) {
    assert.ok(question.q.length >= 8, question.q);
    assert.equal(question.choices.length, 4, question.q);
    assert.equal(new Set(question.choices).size, 4, question.q);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, question.q);
    assert.ok(question.explain.length >= 14, question.q);
    const source = server.sources[question.source];
    assert.ok(source, question.q);
    assert.ok(/^https:\/\/(?:www8\.cao\.go\.jp|www\.mofa\.go\.jp)\//.test(source.url), question.q);
  }
});

test('corrected baseline facts use the published government figures', () => {
  const basics = server.quizzes.find(quiz => quiz.id === 'basics');
  assert.match(basics.questions[5].explain, /5,003\.1/);
  const islands = server.quizzes.find(quiz => quiz.id === 'islands');
  assert.match(islands.questions[3].q, /野付半島/);
  const lifestyle = server.quizzes.find(quiz => quiz.id === 'lifestyle');
  assert.equal(lifestyle.questions[0].choices[lifestyle.questions[0].answer], '7村');
  assert.equal(lifestyle.questions[2].choices[lifestyle.questions[2].answer], '1999年');
});
