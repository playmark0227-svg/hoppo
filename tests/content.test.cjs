const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../functions/content-schema.cjs');
const seed = require('../functions/content-seed.json');
test('all seeded content can be edited through the same validated schema', () => {
  for (const kind of C.KINDS) for (const item of seed[kind]) {
    const value = C.normalize(kind, item, seed.sources);
    assert.equal(value.id, item.id);
  }
  assert.doesNotThrow(() => C.checkPublic(seed));
});
test('government sources, answer ranges, coordinates and URLs are validated', () => {
  const quiz = structuredClone(seed.quizzes[0]);
  quiz.questions[0].sourceUrl = 'https://attacker.example/fake';
  assert.throws(() => C.normalize('quizzes', quiz, seed.sources), /go.jp/);
  delete quiz.questions[0].sourceUrl; quiz.questions[0].answer = 99;
  assert.throws(() => C.normalize('quizzes', quiz, seed.sources));
  assert.throws(() => C.normalize('stamps', { ...seed.stamps[0], lat: 91, lng: 145 }));
  assert.throws(() => C.normalize('stamps', { ...seed.stamps[0], lat: 43, lng: '' }));
  assert.throws(() => C.normalize('shop', { ...seed.shop[0], image: 'javascript:alert(1)' }));
  assert.throws(() => C.normalize('shop', { ...seed.shop[0], image: 'assets/../secret' }));
});
test('unknown fields cannot overwrite status, quiz edition or server metadata', () => {
  const item = C.normalize('stamps', { ...seed.stamps[0], _state: 'published', enabled: true, createdBy: 'fake', arbitrary: 'no' });
  assert.equal('_state' in item, false); assert.equal('arbitrary' in item, false);
  const catalog = structuredClone(seed); catalog.stamps.push(catalog.stamps[0]);
  assert.throws(() => C.checkPublic(catalog), /重複/);
});
