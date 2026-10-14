const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../functions/policy.cjs');
test('public profile never includes private data', () => {
  const profile = P.profile({ name: '<script>', bio: 'secret', region: 'Tokyo', birthday: '2000-01-01', publicRanking: true });
  const result = P.publicProfile('user', { profile, points: 4, totalEarned: 123 });
  assert.deepEqual(Object.keys(result).sort(), ['avatarFrame', 'dmEnabled', 'favoriteIsland', 'name', 'totalEarned', 'uid']);
  assert.equal(result.totalEarned, 123);
});
test('age validation rejects malformed dates and uses Japan date boundary', () => {
  const now = new Date('2026-10-13T16:00:00Z');
  assert.equal(P.adult('2008-10-14', now), true);
  assert.equal(P.adult('2008-10-15', now), false);
  assert.equal(P.adult('2000-02-31', now), false);
  assert.equal(P.adult('1800-01-01', now), false);
  assert.equal(P.adult(''), false);
});
test('DM opt-in requires adult birthday and public ranking', () => {
  assert.equal(P.profile({ birthday: '2000-01-01', dmEnabled: true }).dmEnabled, false);
  assert.equal(P.profile({ birthday: '2020-01-01', dmEnabled: true, publicRanking: true }).dmEnabled, false);
  assert.equal(P.profile({ birthday: '2000-01-01', dmEnabled: true, publicRanking: true }).dmEnabled, true);
});
test('daily check-in is idempotent and calendar-bound in JST', () => {
  const now = new Date('2026-10-13T16:00:00Z');
  assert.equal(P.daily({ lastLoginDate: '2026-10-14' }, now), null);
  assert.equal(P.daily({ lastLoginDate: '2026-10-15' }, now), null);
  assert.deepEqual(P.daily({ lastLoginDate: '2026-10-13', loginStreak: 5 }, now), { today: '2026-10-14', streak: 6, points: 15 });
  assert.equal(P.daily({ lastLoginDate: '2026-10-12', loginStreak: 20 }, now).points, 5);
});
test('quiz replay cannot farm points and perfect score bonus is awarded once', () => {
  assert.equal(P.quizReward(0, 5, 5), 100);
  assert.equal(P.quizReward(5, 5, 5), 0);
  assert.equal(P.quizReward(3, 5, 5), 70);
  assert.equal(P.quizReward(4, 2, 5), 0);
});
test('message idempotency ID, length and thread identity', () => {
  assert.equal(P.threadId('a', 'b'), P.threadId('b', 'a'));
  assert.notEqual(P.threadId('a_b', 'c'), P.threadId('a', 'b_c'));
  assert.throws(() => P.message({ text: 'hi', requestId: 'x' }));
  assert.throws(() => P.message({ text: 'x'.repeat(201), requestId: '1234567890123456' }));
  assert.equal(P.message({ text: '<img src=x>', requestId: '1234567890123456' }), '<img src=x>');
});
test('profile sanitizes limits and unknown enums; awards bound history', () => {
  const p = P.profile({ name: 'x'.repeat(40), avatarFrame: 'javascript:x', favoriteIsland: 'unknown' });
  assert.equal(p.name.length, 12); assert.equal(p.avatarFrame, 'coral'); assert.equal(p.favoriteIsland, 'kunashiri');
  assert.throws(() => P.award({}, -1, '', ''));
  const next = P.award({ history: Array(60).fill({}) }, 5, 'daily', 'daily');
  assert.equal(next.history.length, 50); assert.equal(next.points, 5);
});
