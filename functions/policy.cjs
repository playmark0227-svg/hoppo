const crypto = require('node:crypto');
const VERSION = '2026-10-14';
const ISLANDS = ['etorofu', 'kunashiri', 'shikotan', 'habomai'];
const FRAMES = ['coral', 'ocean', 'gold', 'cherry', 'mint', 'plum'];
const PATTERNS = ['wave', 'dots', 'shine', 'plain'];
const clean = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
function adult(birthday, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday || '')) return false;
  const date = new Date(`${birthday}T00:00:00Z`);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== birthday) return false;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
  const [y, m, d] = today.split('-').map(Number);
  const [by, bm, bd] = birthday.split('-').map(Number);
  const age = y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
  return age >= 18 && age <= 120;
}
function profile(input = {}, now) {
  const birthday = clean(input.birthday, 10);
  return {
    name: clean(input.name, 12) || 'ゲスト',
    bio: clean(input.bio, 80), region: clean(input.region, 24), birthday,
    favoriteIsland: ISLANDS.includes(input.favoriteIsland) ? input.favoriteIsland : 'kunashiri',
    avatarFrame: FRAMES.includes(input.avatarFrame) ? input.avatarFrame : 'coral',
    avatarPattern: PATTERNS.includes(input.avatarPattern) ? input.avatarPattern : 'wave',
    publicRanking: input.publicRanking === true,
    dmEnabled: input.dmEnabled === true && input.publicRanking === true && adult(birthday, now)
  };
}
function publicProfile(uid, user) {
  return { uid, name: user.profile.name, avatarFrame: user.profile.avatarFrame,
    favoriteIsland: user.profile.favoriteIsland, totalEarned: user.totalEarned || 0,
    dmEnabled: user.profile.dmEnabled === true };
}
function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
}
function daily(user, now = new Date()) {
  const today = dayKey(now);
  if (user.lastLoginDate && user.lastLoginDate >= today) return null;
  const gap = (+new Date(today) - +new Date(user.lastLoginDate || '1970-01-01')) / 86400000;
  const streak = gap === 1 ? (user.loginStreak || 0) + 1 : 1;
  return { today, streak, points: 5 + Math.min(streak - 1, 5) * 2 };
}
function award(user, amount, label, type, now = new Date()) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 10000) throw new Error('invalid-award');
  return { ...user, points: (user.points || 0) + amount, totalEarned: (user.totalEarned || 0) + amount,
    history: amount ? [{ points: amount, label: clean(label, 100), type, at: now.toISOString() }, ...(user.history || [])].slice(0, 50) : (user.history || []) };
}
function quizReward(previousBest, correct, total) {
  const value = (n) => n * 10 + (n === total ? 50 : 0);
  return Math.max(0, value(correct) - value(previousBest));
}
function threadId(a, b) { return crypto.createHash('sha256').update(JSON.stringify([a, b].sort())).digest('hex'); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function message(data) {
  const text = clean(data.text, 201);
  if (!text || text.length > 200) throw new Error('invalid-message');
  if (!/^[a-zA-Z0-9_-]{16,64}$/.test(data.requestId || '')) throw new Error('invalid-request-id');
  return text;
}
module.exports = { VERSION, clean, adult, profile, publicProfile, daily, dayKey, award, quizReward, threadId, hash, message };
