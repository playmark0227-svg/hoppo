/* Real users only: never fabricate competitors or automatic replies. */
(function () {
  let tab = 'ranking', otherId = null, stopMessages = null, messages = [], sending = false, outbox = null;
  const pendingReads = new Map();
  const node = id => document.getElementById(id);
  function el(tag, cls, text) { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function button(text, fn) {
    const n = el('button', '', text); n.type = 'button';
    n.addEventListener('click', async () => {
      n.disabled = true;
      try { await fn(); } catch (error) { UI.toast(Cloud.errorMessage(error), 'bad'); } finally { n.disabled = false; }
    }); return n;
  }
  function empty(container, text) { container.replaceChildren(el('p', 'live-empty', text)); }
  function gate(container) {
    const box = el('div', 'live-empty');
    box.append(el('p', '', Cloud.enabled ? 'ログイン・メール確認・利用条件への同意後に利用できます。' : '利用者間のランキング・フォロー・DMは準備中です。架空の利用者や自動返信は表示しません。'), button('ログイン・新規登録', () => Cloud.open())); container.replaceChildren(box);
  }
  function standings() { return Cloud.people.filter(p => !Cloud.blocked.includes(p.uid)); }
  function person(id) { return Cloud.people.find(p => p.uid === id) || Cloud.friendProfiles.find(p => p.uid === id); }
  function closeThread() { stopMessages?.(); stopMessages = null; otherId = null; messages = []; node('dmChat').hidden = true; render(); }
  function openThread(id) {
    if (!Cloud.account) return Cloud.open();
    stopMessages?.(); stopMessages = null; otherId = id; messages = []; switchTab('dm');
    const thread = Cloud.threads.find(t => t.members.includes(id));
    if (thread) stopMessages = Cloud.watchMessages(thread.id, value => { messages = value; renderChat(); markRead(thread.id); }, () => {
      node('liveChatStatus').textContent = 'メッセージを表示できません。ブロックまたは接続設定を確認してください。';
    }); renderChat();
  }
  function markRead(threadId) {
    const last = messages.at(-1);
    if (!last || Cloud.reads[threadId] >= last.at || pendingReads.get(threadId) === last.at) return;
    pendingReads.set(threadId, last.at);
    Cloud.call('markThreadRead', { threadId, at: last.at }).catch(() => {}).finally(() => pendingReads.delete(threadId));
  }
  function row(p, index, actions = true) {
    const n = el('div', 'live-row'); n.append(el('span', '', index === null ? '' : String(index + 1)));
    const info = el('div', ''); info.append(el('div', 'live-row-name', p.name), el('div', 'live-row-meta', `${Number(p.totalEarned || 0).toLocaleString()} pt`)); n.append(info);
    if (!actions || p.uid === Cloud.user?.uid) return n;
    const tools = el('div', 'live-row-actions'), followed = Cloud.following.includes(p.uid), blocked = Cloud.blocked.includes(p.uid);
    if (!blocked) {
      tools.append(button(followed ? 'フォロー解除' : 'フォロー', () => Cloud.call('setFollow', { targetId: p.uid, follow: !followed })));
      if (followed) tools.append(button('DM', () => openThread(p.uid)));
    }
    tools.append(button(blocked ? 'ブロック解除' : 'ブロック', async () => {
      if (!confirm(`${p.name}さんを${blocked ? 'ブロック解除' : 'ブロック'}しますか？`)) return;
      await Cloud.call('setBlock', { targetId: p.uid, block: !blocked }); if (otherId === p.uid) closeThread();
    }), button('通報', () => report(p.uid))); n.append(tools); return n;
  }
  async function report(id) { const reason = prompt('通報理由を入力してください（最大300文字）。'); if (!reason?.trim()) return; await Cloud.call('reportUser', { targetId: id, reason: reason.slice(0, 300) }); UI.toast('通報を受け付けました。'); }
  function renderRanking() {
    const list = node('rankingList'), summary = node('rankingMyRank'); summary.replaceChildren();
    if (!Cloud.account) return gate(list);
    summary.textContent = '累計獲得ポイント順・上位100名（公開設定を有効にした利用者のみ）';
    const entries = standings(); if (!entries.length) return empty(list, 'ランキング参加者はまだいません。プロフィールで公開設定を選べます。');
    list.replaceChildren(...entries.map(p => row(p, Cloud.people.findIndex(entry => entry.uid === p.uid))));
  }
  function renderFriends() {
    const list = node('friendList'); if (!Cloud.account) return gate(list);
    const followed = Cloud.following.filter(id => !Cloud.blocked.includes(id)).map(id => person(id) || { uid: id, name: '非公開のユーザー', totalEarned: 0 });
    const blocked = Cloud.blocked.map(id => person(id) || { uid: id, name: 'ブロック中のユーザー', totalEarned: 0 });
    if (!followed.length && !blocked.length) return empty(list, 'フォロー中の利用者はいません。ランキングからフォローできます。DMは相互フォロー後に利用できます。');
    list.replaceChildren(...followed.map(p => row(p, null)), ...blocked.map(p => row(p, null)));
  }
  function renderDm() {
    const list = node('dmThreadList');
    if (!Cloud.account) { otherId = null; node('dmChat').hidden = true; return gate(list); }
    list.hidden = !!otherId; node('dmChat').hidden = !otherId;
    if (otherId) return renderChat();
    const threads = Cloud.threads.filter(t => !t.members.some(id => Cloud.blocked.includes(id)));
    if (!threads.length) return empty(list, 'まだメッセージはありません。フレンド一覧から相互フォローの相手を選んでください。');
    list.replaceChildren(...threads.map(t => {
      const id = t.members.find(member => member !== Cloud.user.uid), n = button('', () => openThread(id)); n.className = 'live-row';
      n.append(el('span', '', ''), el('span', 'live-row-name', t.names?.[id] || 'ユーザー'), el('span', 'live-row-meta', t.lastText || '')); return n;
    }));
  }
  function renderChat() {
    if (!otherId) return;
    const p = person(otherId), thread = Cloud.threads.find(t => t.members.includes(otherId)); node('dmChatName').textContent = p?.name || thread?.names?.[otherId] || 'ユーザー';
    const log = node('dmLog'); log.replaceChildren(...messages.map(m => {
      const n = el('div', m.senderId === Cloud.user?.uid ? 'dm-msg me' : 'dm-msg them');
      const bubble = el('div', 'dm-bubble'); bubble.append(el('span', 'dm-body', m.text), el('small', 'dm-time', new Date(m.at).toLocaleString('ja-JP')));
      n.append(bubble); return n;
    })); log.scrollTop = log.scrollHeight;
    node('liveChatStatus').textContent = Cloud.account?.profile.dmEnabled ? 'DMは18歳以上の相互フォロー・双方の有効設定が必要です。' : 'プロフィールで誕生日を入力し、DM設定を有効にしてください（18歳以上）。';
    node('dmSendBtn').disabled = sending || !Cloud.account?.profile.dmEnabled;
    node('liveChatTools').replaceChildren(button('ブロック', async () => { if (!confirm('この利用者をブロックしますか？')) return; await Cloud.call('setBlock', { targetId: otherId, block: true }); closeThread(); }), button('通報', () => report(otherId)));
  }
  async function send() {
    if (sending || !otherId) return;
    const input = node('dmInput'), text = input.value.trim(); if (!text) return;
    const destination = otherId; sending = true; node('dmSendBtn').disabled = true;
    if (!outbox || outbox.targetId !== destination || outbox.text !== text) outbox = { targetId: destination, text, requestId: crypto.randomUUID() };
    try {
      const result = await Cloud.call('sendMessage', outbox); outbox = null;
      if (otherId === destination) {
        input.value = ''; stopMessages?.(); stopMessages = Cloud.watchMessages(result.threadId, value => { messages = value; renderChat(); markRead(result.threadId); }, () => { node('liveChatStatus').textContent = 'メッセージを取得できません。'; });
      }
    } catch (error) { UI.toast(Cloud.errorMessage(error), 'bad'); } finally { sending = false; if (otherId === destination) renderChat(); }
  }
  function renderHome() {
    const podium = node('homePodium'), rank = node('homeMyRank'); podium.style.display = 'block';
    if (!Cloud.account) {
      podium.replaceChildren(el('p', 'live-mode-note', Cloud.enabled ? 'ログインして学びの記録を仲間と共有できます。' : '利用者間のランキング・フレンド機能は準備中です。')); rank.textContent = 'ランキング・アカウント設定を見る';
    } else {
      podium.replaceChildren(...Cloud.people.slice(0, 3).filter(p => !Cloud.blocked.includes(p.uid)).map(p => row(p, Cloud.people.findIndex(entry => entry.uid === p.uid), false)));
      const index = Cloud.people.findIndex(p => p.uid === Cloud.user.uid); rank.textContent = index >= 0 ? `あなたの順位：${index + 1}位（上位100名）` : 'ランキング参加はプロフィールの公開設定から';
    } node('homeFriendCount').textContent = `${Cloud.following.length}人`;
  }
  function render() {
    renderRanking(); renderFriends(); renderDm(); renderHome();
    const unread = Cloud.threads.some(t => t.lastSenderId !== Cloud.user?.uid && t.updatedAt > (Cloud.reads[t.id] || '') && !t.members.some(id => Cloud.blocked.includes(id)));
    document.querySelectorAll('.nav-unread-dot').forEach(n => { n.hidden = !unread; });
    document.querySelector('.social-disclaimer').textContent = 'ランキングは累計獲得ポイントで比較します。DMは18歳以上の相互フォローのみ。ブロック・通報が利用できます。';
  }
  function switchTab(which) {
    tab = ['ranking', 'friends', 'dm'].includes(which) ? which : 'ranking';
    document.querySelector('.page-social .page-head h2').textContent = { ranking: 'ランキング', friends: 'フレンド', dm: 'メッセージ' }[tab];
    document.querySelector('.page-social .page-desc').textContent = { ranking: '公開を選んだ利用者の累計獲得ポイント', friends: 'ランキングから仲間を見つけてフォロー', dm: '相互フォローの仲間との会話' }[tab];
    if (tab !== 'dm') { stopMessages?.(); stopMessages = null; otherId = null; }
    document.querySelectorAll('[data-social-tab]').forEach(n => { n.classList.toggle('active', n.dataset.socialTab === tab); n.setAttribute('aria-selected', String(n.dataset.socialTab === tab)); });
    document.querySelectorAll('[data-social-panel]').forEach(n => { n.hidden = n.dataset.socialPanel !== tab; }); render();
  }
  window.Social = { init() {
    const status = el('p', 'live-chat-status'); status.id = 'liveChatStatus'; const tools = el('div', 'live-chat-tools'); tools.id = 'liveChatTools'; node('dmChat').append(status, tools);
    document.querySelectorAll('[data-social-tab]').forEach(n => n.addEventListener('click', () => switchTab(n.dataset.socialTab)));
    node('dmSendBtn').addEventListener('click', send); node('dmInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); } }); node('dmBackBtn').addEventListener('click', closeThread);
    node('homeSocialCard').addEventListener('click', e => { const n = e.target.closest('[data-social-open]'); if (n) { UI.go('social'); switchTab(n.dataset.socialOpen); } });
    UI.on('page', page => { if (page === 'social') render(); else { stopMessages?.(); stopMessages = null; otherId = null; } });
    Cloud.onChange(() => { if (!Cloud.account) { stopMessages?.(); stopMessages = null; otherId = null; } render(); }); render();
  }, refresh: render, openTab: switchTab, getStandings: standings, renderHomeWidget: renderHome };
})();
