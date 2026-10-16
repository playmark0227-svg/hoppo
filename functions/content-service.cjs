const crypto = require('node:crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const C = require('./content-schema.cjs');
const seed = require('./content-seed.json');
const P = require('./policy.cjs');
const fail = (code, text) => { throw new HttpsError(code, text); };
const publicRef = db => db.doc('content/catalog');
const value = snap => snap.exists ? snap.data() : structuredClone(seed);
const plain = item => Object.fromEntries(Object.entries(item).filter(([key]) => !key.startsWith('_')));
function draftFrom(catalog) {
  return { revision: 1, items: Object.fromEntries(C.KINDS.map(kind => [kind,
    Object.fromEntries(catalog[kind].map(item => [item.id, { ...item, _revision: 1, _state: item.archived ? 'archived' : 'published', _publishedRevision: 1,
      ...(kind === 'quizzes' ? { _contentDigest: quizDigest(item, catalog.sources) } : {}) }]))])) };
}
function quizDigest(quiz, sources) {
  return C.fingerprint(quiz.questions.map(q => ({ q: q.q, choices: q.choices, answer: q.answer,
    explain: q.explain, sourceUrl: q.sourceUrl || sources[q.source]?.url, sourceTitle: q.sourceTitle || sources[q.source]?.label })));
}
function sourcesFor(catalog) {
  for (const quiz of catalog.quizzes) for (const q of quiz.questions) {
    if (q.sourceUrl) catalog.sources[q.source] = { label: q.sourceTitle, url: q.sourceUrl };
  }
  return catalog;
}
async function authorized(db, uid) {
  const [role, user] = await db.getAll(db.doc(`admins/${uid}`), db.doc(`users/${uid}`));
  return role.data()?.enabled === true && user.exists && !user.data().suspended && !user.data().deleting;
}
function createContentService(db) {
  async function handle(req) {
    const uid = req.auth.uid, data = req.data || {}, action = data.action;
    const allowed = await authorized(db, uid);
    if (action === 'status') return { authorized: allowed };
    if (!allowed) fail('permission-denied', '管理者権限が必要です。');
    const draftRef = db.doc('adminContent/catalog'), roleRef = db.doc(`admins/${uid}`), userRef = db.doc(`users/${uid}`);
    if (action === 'load') {
      await db.runTransaction(async tx => {
        const [draft, published, role] = await tx.getAll(draftRef, publicRef(db), roleRef);
        if (role.data()?.enabled !== true) fail('permission-denied', '管理者権限が必要です。');
        if (!published.exists) tx.create(publicRef(db), seed);
        if (!draft.exists) tx.create(draftRef, draftFrom(value(published)));
      });
      const [draft, published, events, audit] = await Promise.all([
        draftRef.get(), publicRef(db).get(), db.collection('events').limit(100).get(),
        db.collection('adminAudit').orderBy('at', 'desc').limit(30).get()
      ]);
      return { draft: draft.data(), published: published.data(),
        events: events.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        audit: audit.docs.map(doc => doc.data()) };
    }
    if (action === 'qrShow') {
      const key = data.eventId;
      if (!/^[a-f0-9]{64}$/.test(key || '')) fail('invalid-argument', 'QRの指定が無効です。');
      const secret = await db.doc(`adminEventSecrets/${key}`).get();
      if (!secret.exists) fail('not-found', '旧方式のQRは再表示できません。新しく発行してください。');
      return { code: secret.data().code };
    }
    if (!['save', 'publish', 'archive', 'restore', 'qrIssue', 'qrDisable'].includes(action)) fail('invalid-argument', '操作が無効です。');
    const auditRef = db.collection('adminAudit').doc();
    const now = new Date();
    const rateRef = db.doc(`adminLimits/${uid}_${P.dayKey(now)}`);
    let result;
    await db.runTransaction(async tx => {
      const [draftSnap, pubSnap, roleSnap, userSnap, rateSnap] = await tx.getAll(draftRef, publicRef(db), roleRef, userRef, rateRef);
      if (roleSnap.data()?.enabled !== true || !userSnap.exists || userSnap.data().suspended || userSnap.data().deleting) fail('permission-denied', '管理者権限が必要です。');
      if ((rateSnap.data()?.count || 0) >= 500) fail('resource-exhausted', '本日の管理操作回数の上限です。');
      const published = value(pubSnap), draft = draftSnap.exists ? draftSnap.data() : draftFrom(published);
      let itemId = data.item?.id || data.id || '', kind = data.kind || 'events', label = '';
      if (action === 'qrIssue') {
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(data.requestId || '')) fail('invalid-argument', '発行IDが無効です。');
        const labelInput = C.text(data.label, 100, true), points = C.number(data.points, 0, 500);
        const expiresAt = Date.parse(data.expiresAt);
        const stampId = data.stampId ? C.id(data.stampId) : '';
        if (!Number.isFinite(expiresAt) || expiresAt <= +now || expiresAt > +now + 366 * 86400000) fail('invalid-argument', '有効期限は未来〜1年以内にしてください。');
        if (stampId && !published.stamps.some(stamp => stamp.id === stampId && !stamp.archived)) fail('failed-precondition', '先にスタンプを公開してください。');
        const operation = db.doc(`adminOperations/${uid}_${data.requestId}`), receipt = await tx.get(operation);
        const fingerprint = C.fingerprint([labelInput, points, expiresAt, stampId]);
        if (receipt.exists) {
          if (receipt.data().fingerprint !== fingerprint) fail('invalid-argument', '発行IDが別のQRと重複しています。');
          const secret = await tx.get(db.doc(`adminEventSecrets/${receipt.data().eventId}`));
          result = { eventId: receipt.data().eventId, code: secret.data().code }; return;
        }
        const code = `HOPPO:${crypto.randomBytes(32).toString('base64url')}`, eventId = P.hash(code);
        tx.create(db.doc(`events/${eventId}`), { label: labelInput, points, expiresAt, stampId, active: true, createdAt: now.toISOString() });
        tx.create(db.doc(`adminEventSecrets/${eventId}`), { code });
        tx.create(operation, { eventId, fingerprint });
        result = { eventId, code }; itemId = eventId; label = labelInput;
      } else if (action === 'qrDisable') {
        if (!/^[a-f0-9]{64}$/.test(data.eventId || '')) fail('invalid-argument', 'QRの指定が無効です。');
        const eventRef = db.doc(`events/${data.eventId}`), event = await tx.get(eventRef);
        if (!event.exists) fail('not-found', 'QRが見つかりません。');
        tx.update(eventRef, { active: false, disabledAt: now.toISOString() }); itemId = event.id; label = event.data().label;
        result = { ok: true };
      } else {
        if (!C.KINDS.includes(kind)) fail('invalid-argument', '編集対象が無効です。');
        itemId = C.id(itemId);
        const previous = draft.items[kind][itemId];
        if ((previous?._revision || 0) !== data.baseRevision) fail('aborted', '別の操作で更新されています。再読み込みして変更内容を確認してください。');
        if (['islands', 'ranks'].includes(kind) && (!previous || ['archive', 'restore'].includes(action))) fail('failed-precondition', '四島と5階級は固定です。既存項目の内容を編集してください。');
        if (action === 'save') {
          const next = C.normalize(kind, data.item, published.sources);
          draft.items[kind][itemId] = { ...next, _revision: (previous?._revision || 0) + 1,
            _publishedRevision: previous?._publishedRevision || 0, _state: 'draft',
            ...(kind === 'quizzes' && previous?.version ? { version: previous.version, _contentDigest: previous._contentDigest || '' } : {}) };
        } else {
          if (!previous) fail('not-found', '項目が見つかりません。');
          const item = { ...previous, _revision: previous._revision + 1 };
          if (action === 'publish') {
            const next = C.normalize(kind, item, published.sources);
            if (kind === 'quizzes') {
              if (data.reviewed !== true) fail('failed-precondition', '政府出典と設問・正解・解説の内容確認が必要です。');
              const old = published.quizzes.find(q => q.id === itemId);
              const digest = quizDigest(next, published.sources);
              next.version = old && quizDigest(old, published.sources) === digest ? old.version || published.version
                : item._contentDigest === digest && item.version ? item.version : `managed-${digest.slice(0, 24)}`;
              item._contentDigest = digest;
            }
            published[kind] = [...published[kind].filter(old => old.id !== itemId), next].sort((a, b) => (a.order || 0) - (b.order || 0));
            item._state = 'published'; item._publishedRevision = item._revision;
            if (kind === 'quizzes') item.version = next.version;
          } else if (action === 'archive') {
            published[kind] = kind === 'stamps' ? published[kind].map(old => old.id === itemId ? { ...old, archived: true } : old)
              : published[kind].filter(old => old.id !== itemId);
            item._state = 'archived';
          } else item._state = 'draft';
          draft.items[kind][itemId] = item;
          if (action !== 'restore') {
            sourcesFor(published); C.checkPublic(published);
            published.revision = (published.revision || 0) + 1;
            tx.set(publicRef(db), published);
          }
        }
        draft.revision++;
        if (Buffer.byteLength(JSON.stringify(draft)) > 850000) fail('resource-exhausted', '下書きデータ量の上限です。運営担当へ連絡してください。');
        tx.set(draftRef, draft);
        result = { item: draft.items[kind][itemId] };
        label = result.item.title || result.item.name;
      }
      tx.set(rateRef, { count: (rateSnap.data()?.count || 0) + 1, day: P.dayKey(now) });
      tx.create(auditRef, { uid, action, kind, itemId, label: label || '', at: now.toISOString() });
    });
    return result;
  }
  return { handle };
}
module.exports = { createContentService, seed, value, publicRef };
