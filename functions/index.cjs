const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const crypto = require('node:crypto');
const P = require('./policy.cjs');
const catalog = require('./catalog.json');
initializeApp();
const db = getFirestore();
const lineChannelId = defineString('LINE_CHANNEL_ID', { default: 'disabled' });
// Domain-restricted organizations use a per-service HTTP entry setting, not allUsers IAM grants.
const options = { region: 'asia-northeast1', maxInstances: 10, timeoutSeconds: 30, invoker: 'private',
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' };
const fail = (code, text) => { throw new HttpsError(code, text); };
function uid(req) {
  if (!req.auth) fail('unauthenticated', 'ログインしてください。');
  if (req.auth.token.email_verified !== true && req.auth.token.lineVerified !== true) {
    fail('permission-denied', 'メールアドレスを確認してください。');
  }
  return req.auth.uid;
}
function active(snap) {
  if (!snap.exists) fail('failed-precondition', '利用規約への同意と初期登録が必要です。');
  const user = snap.data();
  if (user.suspended || user.deleting) fail('permission-denied', 'このアカウントは利用できません。');
  return user;
}
function target(req) {
  const value = req.data?.targetId;
  if (typeof value !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(value) || value === uid(req)) {
    fail('invalid-argument', '対象ユーザーが無効です。');
  }
  return value;
}
function publish(tx, id, user) {
  const ref = db.doc(`publicProfiles/${id}`);
  if (user.profile.publicRanking && !user.suspended && !user.deleting) tx.set(ref, P.publicProfile(id, user));
  else tx.delete(ref);
}
function consume(tx, ref, snap, max, now) {
  const old = snap.data() || {};
  if ((old.count || 0) >= max) fail('resource-exhausted', '操作回数の上限です。しばらく待ってからお試しください。');
  tx.set(ref, { count: (old.count || 0) + 1, at: now.toISOString() });
}
async function verifyLineToken(token) {
  const clientId = lineChannelId.value();
  if (!/^\d+$/.test(clientId)) fail('failed-precondition', 'LINEログインは準備中です。');
  if (typeof token !== 'string' || token.length < 20 || token.length > 10000) fail('invalid-argument', 'IDトークンが無効です。');
  let response;
  try {
    response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: token, client_id: clientId }), signal: AbortSignal.timeout(10000)
    });
  } catch { fail('unavailable', 'LINE認証へ接続できません。時間を空けてお試しください。'); }
  if (!response.ok) fail('unauthenticated', 'LINE認証を確認できませんでした。');
  let identity;
  try { identity = await response.json(); } catch { fail('unavailable', 'LINE認証の応答を確認できませんでした。'); }
  if (identity.aud !== clientId || identity.iss !== 'https://access.line.me' ||
      !/^U[0-9a-f]{32}$/i.test(identity.sub || '') || !Number.isFinite(identity.exp) || identity.exp * 1000 <= Date.now()) {
    fail('unauthenticated', 'LINE認証が期限切れ、または対象外です。');
  }
  return P.hash(identity.sub);
}
exports.exchangeLineToken = onCall(options, async (req) => {
  const lineHash = await verifyLineToken(req.data?.idToken);
  const linked = await db.doc(`lineLinks/${lineHash}`).get();
  const id = linked.exists ? linked.data().uid : `line_${lineHash}`;
  // Never trust a client-supplied LINE profile, email, or Firebase uid.
  return { token: await getAuth().createCustomToken(id, { lineVerified: true, lineHash }) };
});
exports.linkLineAccount = onCall(options, async (req) => {
  const id = uid(req);
  const identity = await getAuth().getUser(id);
  if (!identity.email || !identity.emailVerified || req.auth.token.firebase?.sign_in_provider !== 'password') {
    fail('failed-precondition', 'メール確認済みのメールアカウントでログインしてください。');
  }
  if (req.data?.consent !== true) fail('invalid-argument', 'LINE連携への同意が必要です。');
  const lineHash = await verifyLineToken(req.data?.idToken);
  const lineRef = db.doc(`lineLinks/${lineHash}`), userRef = db.doc(`users/${id}`);
  const separateRef = db.doc(`users/line_${lineHash}`);
  await db.runTransaction(async (tx) => {
    const [linked, userSnap, separate] = await tx.getAll(lineRef, userRef, separateRef);
    const user = active(userSnap);
    if ((linked.exists && linked.data().uid !== id) || separate.exists) {
      fail('already-exists', 'このLINEアカウントには別の学習記録があります。自動統合はできません。');
    }
    if (user.lineHash && user.lineHash !== lineHash) fail('failed-precondition', '別のLINEアカウントが連携済みです。');
    if (!linked.exists) tx.create(lineRef, { uid: id, linkedAt: new Date().toISOString() });
    tx.update(userRef, { lineHash });
  });
  return { linked: true };
});
exports.ensureAccount = onCall(options, async (req) => {
  const id = uid(req);
  let identity;
  try { identity = await getAuth().getUser(id); } catch { fail('unauthenticated', 'このログイン情報は無効です。'); }
  if (identity.disabled) fail('permission-denied', 'このアカウントは利用できません。');
  if (req.data?.termsVersion !== P.VERSION) fail('failed-precondition', '最新の利用条件に同意してください。');
  const ref = db.doc(`users/${id}`);
  const lineHash = req.auth.token.lineHash;
  const separateLineLogin = /^[a-f0-9]{64}$/.test(lineHash || '') && id === `line_${lineHash}`;
  await db.runTransaction(async (tx) => {
    const refs = [ref, db.doc(`accountClosures/${id}`)];
    if (separateLineLogin) refs.push(db.doc(`lineLinks/${lineHash}`));
    const [snap, closed, linked] = await tx.getAll(...refs);
    if (linked?.exists && linked.data().uid !== id) fail('already-exists', 'このLINEアカウントは別の学習記録に連携済みです。再度ログインしてください。');
    if (closed.exists && (req.auth.token.auth_time || 0) * 1000 <= closed.data().at) fail('unauthenticated', '削除前のログイン情報は使えません。');
    if (snap.exists) { const user = active(snap); if (user.termsVersion !== P.VERSION) tx.update(ref, { termsVersion: P.VERSION, consentAt: new Date().toISOString() }); return; }
    tx.set(ref, { profile: P.profile({ name: req.data?.name }), termsVersion: P.VERSION,
      lineHash: req.auth.token.lineHash || null,
      consentAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      points: 0, totalEarned: 0, history: [], quizResults: {}, stamps: {}, usedQrCodes: [],
      lastLoginDate: '', loginStreak: 0, longestStreak: 0, loginTotal: 0 });
  });
  return { ok: true };
});
exports.updateProfile = onCall(options, async (req) => {
  const id = uid(req), now = new Date(), ref = db.doc(`users/${id}`);
  const input = req.data?.profile;
  if (!input || typeof input !== 'object') fail('invalid-argument', 'プロフィールが必要です。');
  const next = P.profile(input, now);
  if (input.dmEnabled === true && !next.dmEnabled) fail('failed-precondition', 'DMは18歳以上・ランキング参加者のみ有効にできます。');
  await db.runTransaction(async (tx) => {
    const rate = db.doc(`users/${id}/limits/profile-${P.dayKey(now)}`);
    const [snap, rateSnap] = await tx.getAll(ref, rate);
    const user = active(snap);
    consume(tx, rate, rateSnap, 100, now);
    user.profile = next;
    tx.set(ref, user); publish(tx, id, user);
  });
  return { profile: next };
});
exports.claimDaily = onCall(options, async (req) => {
  const id = uid(req), ref = db.doc(`users/${id}`), now = new Date();
  return db.runTransaction(async (tx) => {
    const user = active(await tx.get(ref)), bonus = P.daily(user, now);
    if (!bonus) return { points: 0 };
    const next = P.award(user, bonus.points, 'ログインボーナス', 'daily', now);
    Object.assign(next, { lastLoginDate: bonus.today, loginStreak: bonus.streak,
      longestStreak: Math.max(user.longestStreak || 0, bonus.streak), loginTotal: (user.loginTotal || 0) + 1 });
    tx.set(ref, next); publish(tx, id, next);
    return { points: bonus.points, streak: bonus.streak };
  });
});
exports.beginQuiz = onCall(options, async (req) => {
  const id = uid(req), quiz = catalog.quizzes.find(q => q.id === req.data?.quizId);
  if (!quiz) fail('not-found', 'クイズが見つかりません。');
  const now = new Date(), session = db.collection('quizSessions').doc();
  await db.runTransaction(async (tx) => {
    const rate = db.doc(`users/${id}/limits/quiz-${P.dayKey(now)}`);
    const [user, rateSnap] = await tx.getAll(db.doc(`users/${id}`), rate);
    active(user); consume(tx, rate, rateSnap, 40, now);
    tx.set(session, { uid: id, quizId: quiz.id, version: catalog.version, index: 0,
      correct: 0, expiresAt: Date.now() + 30 * 60 * 1000 });
  });
  return { sessionId: session.id, questions: quiz.questions.map(q => ({ q: q.q, choices: q.choices })) };
});
exports.answerQuiz = onCall(options, async (req) => {
  const id = uid(req), data = req.data || {}, now = new Date();
  if (!/^[a-zA-Z0-9]{20}$/.test(data.sessionId || '')) fail('invalid-argument', 'セッションが無効です。');
  const ref = db.doc(`quizSessions/${data.sessionId}`), userRef = db.doc(`users/${id}`);
  return db.runTransaction(async (tx) => {
    const [sessionSnap, userSnap] = await tx.getAll(ref, userRef);
    const session = sessionSnap.data(), user = active(userSnap);
    if (!session || session.uid !== id || session.expiresAt < Date.now() || session.version !== catalog.version) {
      fail('permission-denied', 'セッションの期限が切れました。もう一度開始してください。');
    }
    // Network retries reuse the last response without granting points twice.
    if (data.index === session.index - 1 && data.choice === session.lastChoice) return session.lastResponse;
    const quiz = catalog.quizzes.find(q => q.id === session.quizId), question = quiz?.questions[session.index];
    if (!question || data.index !== session.index || !Number.isInteger(data.choice) || data.choice < 0 || data.choice >= question.choices.length) {
      fail('invalid-argument', '回答が無効です。');
    }
    const correct = data.choice === question.answer;
    const count = session.correct + (correct ? 1 : 0), done = session.index + 1 === quiz.questions.length;
    let earned = 0;
    if (done) {
      const key = `${catalog.version}:${quiz.id}`, prev = user.quizResults[key] || { bestScore: 0, timesPlayed: 0 };
      earned = P.quizReward(prev.bestScore, count, quiz.questions.length);
      const next = P.award(user, earned, `クイズ：${quiz.title}`, 'quiz', now);
      next.quizResults[key] = { bestScore: Math.max(prev.bestScore, count), timesPlayed: prev.timesPlayed + 1,
        total: quiz.questions.length, lastPlayedAt: now.toISOString(), quizId: quiz.id };
      tx.set(userRef, next); publish(tx, id, next);
    }
    const result = { correct, answer: question.answer, explain: question.explain || '',
      source: question.source, done, earned, correctCount: count };
    tx.update(ref, { index: session.index + 1, correct: count, lastChoice: data.choice, lastResponse: result });
    return result;
  });
});
exports.redeemEvent = onCall(options, async (req) => {
  const id = uid(req), now = new Date(), code = P.clean(req.data?.code, 200);
  if (!/^HOPPO:[a-zA-Z0-9_-]{32,100}$/.test(code)) fail('invalid-argument', '本番イベントのコードではありません。');
  const key = P.hash(code), ref = db.doc(`events/${key}`), userRef = db.doc(`users/${id}`);
  return db.runTransaction(async (tx) => {
    const claim = db.doc(`users/${id}/claims/${key}`);
    const rate = db.doc(`users/${id}/limits/qr-${P.dayKey(now)}`);
    const [eventSnap, userSnap, claimed, rateSnap] = await tx.getAll(ref, userRef, claim, rate);
    const user = active(userSnap), event = eventSnap.data();
    if (!event || !event.active || event.expiresAt <= Date.now()) fail('not-found', 'イベントコードは無効、または期限切れです。');
    if (claimed.exists) return { points: 0, alreadyClaimed: true };
    if (event.stampId && user.stamps[event.stampId]) return { points: 0, alreadyClaimed: true };
    consume(tx, rate, rateSnap, 20, now);
    const next = P.award(user, event.points, event.label, 'qr', now);
    next.usedQrCodes = [...(user.usedQrCodes || []), key].slice(-200);
    if (event.stampId) next.stamps[event.stampId] = now.toISOString();
    tx.set(claim, { at: now.toISOString() }); tx.set(userRef, next); publish(tx, id, next);
    return { points: event.points, label: event.label, stampId: event.stampId || '' };
  });
});
exports.setFollow = onCall(options, async (req) => {
  const id = uid(req), other = target(req), now = new Date();
  await db.runTransaction(async (tx) => {
    const follow = db.doc(`users/${id}/following/${other}`), rate = db.doc(`users/${id}/limits/follow-${P.dayKey(now)}`);
    const refs = [db.doc(`users/${id}`), db.doc(`users/${other}`),
      db.doc(`users/${id}/blocks/${other}`), db.doc(`users/${other}/blocks/${id}`), rate];
    const [meSnap, themSnap, aBlock, bBlock, rateSnap] = await tx.getAll(...refs);
    const me = active(meSnap);
    if (req.data.follow === true) {
      const them = active(themSnap);
      if (!me.profile.publicRanking || !them.profile.publicRanking || aBlock.exists || bBlock.exists) fail('permission-denied', 'このユーザーはフォローできません。');
      const current = await tx.get(db.collection(`users/${id}/following`).limit(101));
      if (current.size >= 100 && !current.docs.some(doc => doc.id === other)) fail('resource-exhausted', 'フォローは100人までです。');
    }
    consume(tx, rate, rateSnap, 100, now);
    if (req.data.follow === true) tx.set(follow, { targetId: other, at: now.toISOString() }); else tx.delete(follow);
  });
  return { ok: true };
});
exports.setBlock = onCall(options, async (req) => {
  const id = uid(req), other = target(req);
  await db.runTransaction(async (tx) => {
    active(await tx.get(db.doc(`users/${id}`)));
    const ref = db.doc(`users/${id}/blocks/${other}`);
    if (req.data.block === true) {
      tx.set(ref, { targetId: other, at: new Date().toISOString() });
      tx.delete(db.doc(`users/${id}/following/${other}`)); tx.delete(db.doc(`users/${other}/following/${id}`));
    } else tx.delete(ref);
  });
  return { ok: true };
});
exports.sendMessage = onCall(options, async (req) => {
  const id = uid(req), other = target(req), now = new Date();
  let text;
  try { text = P.message(req.data || {}); } catch { fail('invalid-argument', '本文または送信IDが無効です。'); }
  const thread = db.doc(`threads/${P.threadId(id, other)}`);
  const messageRef = thread.collection('messages').doc(`${id}_${req.data.requestId}`);
  await db.runTransaction(async (tx) => {
    const minute = db.doc(`users/${id}/limits/dm-minute-${Math.floor(Date.now() / 60000)}`);
    const day = db.doc(`users/${id}/limits/dm-${P.dayKey(now)}`);
    const refs = [db.doc(`users/${id}`), db.doc(`users/${other}`),
      db.doc(`users/${id}/blocks/${other}`), db.doc(`users/${other}/blocks/${id}`),
      db.doc(`users/${id}/following/${other}`), db.doc(`users/${other}/following/${id}`), messageRef, minute, day];
    const [meSnap, themSnap, aBlock, bBlock, aFollow, bFollow, existing, minuteSnap, daySnap] = await tx.getAll(...refs);
    const me = active(meSnap), them = active(themSnap);
    if (!me.profile.dmEnabled || !them.profile.dmEnabled || !me.profile.publicRanking || !them.profile.publicRanking ||
        aBlock.exists || bBlock.exists || !aFollow.exists || !bFollow.exists) {
      fail('permission-denied', 'DMには18歳以上の双方の有効設定と相互フォローが必要です。');
    }
    if (existing.exists) return;
    consume(tx, minute, minuteSnap, 5, now); consume(tx, day, daySnap, 200, now);
    tx.set(thread, { members: [id, other].sort(), names: { [id]: me.profile.name, [other]: them.profile.name },
      updatedAt: now.toISOString(), lastText: text, lastSenderId: id }, { merge: true });
    tx.create(messageRef, { senderId: id, text, at: now.toISOString() });
  });
  return { threadId: thread.id };
});
exports.markThreadRead = onCall(options, async (req) => {
  const id = uid(req), threadId = req.data?.threadId, at = req.data?.at;
  if (!/^[0-9a-f]{64}$/.test(threadId || '') || typeof at !== 'string' || !Number.isFinite(Date.parse(at))) fail('invalid-argument', '会話の指定が無効です。');
  const ref = db.doc(`users/${id}/reads/${threadId}`);
  await db.runTransaction(async (tx) => {
    const [user, thread, previous] = await tx.getAll(db.doc(`users/${id}`), db.doc(`threads/${threadId}`), ref);
    active(user);
    if (!thread.exists || !thread.data().members.includes(id)) fail('permission-denied', 'この会話は読めません。');
    const seen = new Date(Math.min(Date.parse(at), Date.parse(thread.data().updatedAt))).toISOString();
    if (!previous.exists || previous.data().at < seen) tx.set(ref, { at: seen });
  });
  return { ok: true };
});
exports.reportUser = onCall(options, async (req) => {
  const id = uid(req), other = target(req), now = new Date();
  const reason = P.clean(req.data?.reason, 300);
  if (!reason) fail('invalid-argument', '通報理由を入力してください。');
  await db.runTransaction(async (tx) => {
    const rate = db.doc(`users/${id}/limits/report-${P.dayKey(now)}`), evidenceRef = db.doc(`threads/${P.threadId(id, other)}`);
    const [user, rateSnap, evidence] = await tx.getAll(db.doc(`users/${id}`), rate, evidenceRef);
    active(user); consume(tx, rate, rateSnap, 10, now);
    tx.create(db.collection('reports').doc(), { reporterId: id, targetId: other, reason,
      threadId: evidence.exists ? evidence.id : '', at: now.toISOString(), status: 'pending' });
  });
  return { ok: true };
});

exports.deleteAccount = onCall(options, async (req) => {
  const id = uid(req);
  if (Date.now() / 1000 - (req.auth.token.auth_time || 0) > 300) fail('failed-precondition', '一度ログアウトし、再ログインしてから削除してください。');
  const ref = db.doc(`users/${id}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const lineRef = snap.data()?.lineHash ? db.doc(`lineLinks/${snap.data().lineHash}`) : null;
    const link = lineRef ? await tx.get(lineRef) : null;
    if (snap.exists) { tx.update(ref, { deleting: true }); }
    if (link?.data()?.uid === id) tx.delete(lineRef);
    tx.delete(db.doc(`publicProfiles/${id}`));
    tx.set(db.doc(`accountClosures/${id}`), { at: Date.now() });
  });
  const chats = await db.collection('threads').where('members', 'array-contains', id).get();
  for (const chat of chats.docs) await db.recursiveDelete(chat.ref);
  for (const group of ['following', 'blocks']) {
    const references = await db.collectionGroup(group).where('targetId', '==', id).get();
    const writer = db.bulkWriter(); references.docs.forEach(doc => writer.delete(doc.ref)); await writer.close();
  }
  const sessions = await db.collection('quizSessions').where('uid', '==', id).get();
  const writer = db.bulkWriter(); sessions.docs.forEach(doc => writer.delete(doc.ref)); await writer.close();
  await db.recursiveDelete(ref);
  await getAuth().deleteUser(id);
  return { ok: true };
});
