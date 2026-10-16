const crypto = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const KINDS = ['quizzes', 'stamps', 'shop', 'furusato', 'notices', 'islands', 'ranks'];
const COLORS = ['coral', 'ocean', 'gold', 'cherry', 'mint', 'plum', 'silver'];
const bad = text => { throw new HttpsError('invalid-argument', text); };
function text(value, max, required = false) {
  if (value != null && typeof value !== 'string') bad('文字列を入力してください。');
  const out = (value || '').trim();
  if (out.length > max || (required && !out)) bad(`必須項目と文字数（最大${max}文字）を確認してください。`);
  return out;
}
function number(value, min, max) {
  const out = Number(value);
  if (!Number.isSafeInteger(out) || out < min || out > max) bad(`${min}〜${max}の整数を入力してください。`);
  return out;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)) bad('IDは英小文字・数字・ハイフン・アンダースコアで指定してください。');
  return value;
}
function url(value, government = false, image = false) {
  const input = text(value, 1000, government);
  if (!input) return '';
  if (image && /^assets\/[a-zA-Z0-9_./-]+$/.test(input) && !input.includes('..')) return input;
  let parsed;
  try { parsed = new URL(input); } catch { bad('URLの形式を確認してください。'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      (government && !parsed.hostname.endsWith('.go.jp'))) bad(government ? '出典には日本政府機関のHTTPS URL（go.jp）が必要です。' : 'HTTPSのURLを入力してください。');
  // Safe even when older views interpolate the URL into a CSS background attribute.
  return parsed.href.replace(/["'<>\\()]/g, c => `%${c.charCodeAt(0).toString(16)}`);
}
function facts(input = []) {
  if (!Array.isArray(input) || input.length > 8) bad('補足情報は8件までです。');
  return input.map(f => ({ k: text(f.k, 40, true), v: text(f.v, 160, true) }));
}
function normalize(kind, input, sources = {}) {
  if (!KINDS.includes(kind) || !input || typeof input !== 'object' || Array.isArray(input)) bad('編集対象が無効です。');
  const out = { id: id(input.id), order: number(input.order ?? 0, 0, 10000) };
  if (kind === 'quizzes') {
    Object.assign(out, { title: text(input.title, 100, true), desc: text(input.desc, 300),
      level: text(input.level, 10, true), icon: text(input.icon || '学習', 8), image: url(input.image, false, true) });
    if (!['入門', '初級', '中級', '上級', '超難問'].includes(out.level)) bad('難易度を選択してください。');
    if (!Array.isArray(input.questions) || !input.questions.length || input.questions.length > 30) bad('設問は1〜30問にしてください。');
    out.questions = input.questions.map(q => {
      if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) bad('選択肢は2〜6個にしてください。');
      const sourceUrl = url(q.sourceUrl || sources[q.source]?.url, true);
      const sourceTitle = text(q.sourceTitle || sources[q.source]?.label, 100, true);
      return { q: text(q.q, 500, true), choices: q.choices.map(c => text(c, 250, true)),
        answer: number(q.answer, 0, q.choices.length - 1), explain: text(q.explain, 1500, true),
        source: `gov_${crypto.createHash('sha256').update(sourceUrl + sourceTitle).digest('hex').slice(0, 20)}`,
        sourceUrl, sourceTitle };
    });
  } else {
    out.name = text(input.name || input.title, 100, true);
    out.image = url(input.image, false, true);
    out.desc = text(input.desc, 500);
    if (['stamps', 'shop', 'furusato'].includes(kind)) {
      out.emoji = text(input.emoji || (kind === 'stamps' ? '印' : '品'), 12);
      const color = input.color || input.accent || 'coral';
      if (!COLORS.includes(color)) bad('色を選択してください。');
      out[kind === 'stamps' ? 'color' : 'accent'] = color;
    }
    if (kind === 'stamps') {
      Object.assign(out, { no: number(input.no, 1, 9999), kana: text(input.kana, 100), area: text(input.area, 160, true),
        body: text(input.body, 3000, true), hint: text(input.hint || input.desc, 500, true),
        address: text(input.address, 300), facts: facts(input.facts) });
      const hasLat = input.lat !== '' && input.lat != null, hasLng = input.lng !== '' && input.lng != null;
      if (hasLat !== hasLng) bad('緯度と経度は両方指定してください。');
      out.lat = hasLat ? Number(input.lat) : null; out.lng = hasLng ? Number(input.lng) : null;
      if (hasLat && (!Number.isFinite(out.lat) || !Number.isFinite(out.lng) || Math.abs(out.lat) > 90 || Math.abs(out.lng) > 180)) bad('緯度・経度の範囲を確認してください。');
    }
    if (kind === 'shop') out.price = number(input.price, 1, 1000000);
    if (kind === 'furusato') Object.assign(out, { amount: number(input.amount, 1, 10000000), category: text(input.category, 40, true),
      url: url(input.url || 'https://www.furusato-tax.jp/city/info/01223') });
    if (kind === 'notices') Object.assign(out, { body: text(input.body || input.desc, 1000, true), url: url(input.url) });
    if (kind === 'islands') Object.assign(out, { en: text(input.en, 40), kana: text(input.kana, 80), body: text(input.body, 3000, true), facts: facts(input.facts) });
    if (kind === 'ranks') Object.assign(out, { emoji: text(input.emoji, 12), sub: text(input.sub, 80, true),
      en: text(input.en, 80, true), min: number(input.min, 0, 1000000), color: /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : '#5aa7d1', blurb: text(input.blurb, 300) });
  }
  return out;
}
function checkPublic(catalog) {
  for (const kind of KINDS) if (catalog[kind].length > 150) bad('各種類の公開件数は150件までです。');
  const nos = catalog.stamps.filter(s => !s.archived).map(s => s.no);
  if (new Set(nos).size !== nos.length) bad('スタンプ番号が重複しています。');
  const ranks = [...catalog.ranks].sort((a, b) => a.min - b.min);
  if (ranks.length !== 5 || ranks[0].min !== 0 || ranks.some((r, i) => i && r.min <= ranks[i - 1].min)) bad('階級は5段階、最初は0pt、以降は重複のない昇順で指定してください。');
  if (Buffer.byteLength(JSON.stringify(catalog)) > 800000) bad('公開データ量の上限です。不要な項目を公開停止してください。');
}
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
module.exports = { KINDS, normalize, checkPublic, fingerprint, text, number, id };
