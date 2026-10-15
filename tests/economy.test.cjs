const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadData() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/data.js'), 'utf8'), { window });
  return window;
}

test('rank thresholds end at 50,000 lifetime points and remain ordered', () => {
  const data = loadData();
  assert.deepEqual(Array.from(data.RANKS, rank => rank.min), [0, 2500, 7500, 20000, 50000]);
  assert.equal(data.getRankByPoints(49999).id, 'clione');
  assert.equal(data.getRankByPoints(50000).id, 'prime');
  assert.equal(data.getNextRank(20000).min, 50000);
  assert.equal(data.getNextRank(50000), null);
});

test('shop prices require substantial spendable balances', () => {
  const data = loadData();
  const prices = Object.fromEntries(Array.from(data.SHOP_ITEMS, item => [item.id, item.price]));
  assert.equal(prices['sticker-erika'], 1250);
  assert.equal(prices['plush-big'], 20000);
  assert.ok(data.SHOP_ITEMS.every(item => Number.isInteger(item.price) && item.price >= 1250));
});

test('shop spending leaves lifetime rank progress intact', () => {
  const data = loadData();
  const state = { points: 20000, totalEarned: 50000 };
  const rank = data.getRankByPoints(state.totalEarned);
  state.points -= data.SHOP_ITEMS.find(item => item.id === 'plush-big').price;
  assert.equal(state.points, 0);
  assert.equal(data.getRankByPoints(state.totalEarned).id, rank.id);
});
