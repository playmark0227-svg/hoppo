/* ============================================================
   Social — ランキング / フレンド / メッセージ（ローカルデモ）
   ライバルはアプリ内キャラクター。データは端末内のみ・外部送信なし。
   ポイントは日数経過で決定的に成長し、毎日順位が動きます。
   ============================================================ */
(function() {

  const EPOCH = Date.UTC(2026, 4, 1); // 2026-05-01 基準
  const DAY = 86400000;

  let currentTab = 'ranking';
  let openThreadId = null;
  let replyTimer = null;

  /* ---------------- Rival points (deterministic growth) ---------------- */

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function rivalPoints(r) {
    const days = Math.max(0, Math.floor((Date.now() - EPOCH) / DAY));
    const seed = hashCode(r.id);
    // base + steady growth + small daily wobble (deterministic per rival per day)
    const wobble = ((days * 7 + seed) % 11) * 2;
    return r.base + days * r.rate + wobble;
  }

  function getRival(id) {
    return (window.RIVALS || []).find(r => r.id === id) || null;
  }

  /* ---------------- Tabs ---------------- */

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('[data-social-tab]').forEach(btn => {
      const active = btn.dataset.socialTab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.social-panel').forEach(p => {
      const show = p.dataset.socialPanel === tab;
      p.hidden = !show;
    });
    if (tab !== 'dm') closeThread(false);
    render();
  }

  /* ---------------- Ranking ---------------- */

  function renderRanking() {
    const list = document.getElementById('rankingList');
    if (!list) return;
    const s = Store.get();

    const entries = (window.RIVALS || []).map(r => ({
      id: r.id, name: r.name, emoji: r.emoji, frame: r.frame,
      points: rivalPoints(r), me: false
    }));
    entries.push({
      id: 'me', name: s.name || 'ゲスト', emoji: '', frame: s.profile.avatarFrame || 'coral',
      points: s.points, me: true
    });
    entries.sort((a, b) => b.points - a.points);

    const myRank = entries.findIndex(e => e.me) + 1;
    const head = document.getElementById('rankingMyRank');
    if (head) head.innerHTML = `あなたの順位：<strong>${myRank}位</strong> / ${entries.length}人中`;

    const medals = ['🥇', '🥈', '🥉'];
    const avatarSrc = (Store.getProfile().avatarImage) || 'assets/characters/erika-main.png';

    list.innerHTML = entries.map((e, i) => {
      const rankBadge = window.getRankByPoints ? window.getRankByPoints(e.points) : null;
      const following = !e.me && Store.isFollowing(e.id);
      const face = e.me
        ? `<span class="srow-avatar avatar" data-frame="${e.frame}"><img src="${avatarSrc}" alt=""></span>`
        : `<span class="srow-avatar srow-avatar-emoji" data-frame="${e.frame}">${e.emoji}</span>`;
      return `
        <div class="srow ${e.me ? 'is-me' : ''}">
          <span class="srow-rank">${medals[i] || (i + 1)}</span>
          ${face}
          <span class="srow-meta">
            <span class="srow-name">${e.name}${e.me ? '<small class="srow-you">あなた</small>' : ''}</span>
            <span class="srow-sub">${rankBadge ? rankBadge.emoji + ' ' + rankBadge.name : ''}</span>
          </span>
          <span class="srow-points"><strong>${e.points.toLocaleString()}</strong><small>pt</small></span>
          ${e.me ? '' : `
            <button type="button" class="srow-follow ${following ? 'on' : ''}" data-follow="${e.id}">
              ${following ? 'フォロー中' : 'フォロー'}
            </button>`}
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-follow]').forEach(btn => {
      btn.addEventListener('click', () => toggleFollow(btn.dataset.follow));
    });
  }

  function toggleFollow(id) {
    const r = getRival(id);
    if (!r) return;
    if (Store.isFollowing(id)) {
      if (!confirm(`${r.name} のフォローを解除しますか？`)) return;
      Store.unfollow(id);
      UI.toast(`${r.name} のフォローを解除しました`, 'good', 1800);
    } else {
      Store.follow(id);
      UI.toast(`${r.emoji} ${r.name} をフォローしました！`, 'good', 2000);
      // 初回フォロー時にあいさつDMが届く
      const dms = Store.getDms(id);
      if (dms.length === 0) {
        setTimeout(() => {
          Store.addDm(id, { me: false, text: r.greeting, at: new Date().toISOString() });
        }, 900);
      }
    }
    render();
  }

  /* ---------------- Friends ---------------- */

  function renderFriends() {
    const list = document.getElementById('friendList');
    if (!list) return;
    const following = Store.get().social.following
      .map(getRival).filter(Boolean);

    if (!following.length) {
      list.innerHTML = `
        <div class="social-empty">
          <div class="social-empty-icon">👥</div>
          <p>まだフレンドがいません。<br>ランキングから気になる仲間をフォローしてみよう！</p>
          <button type="button" class="btn btn-outline" data-social-go="ranking">ランキングを見る</button>
        </div>`;
      const go = list.querySelector('[data-social-go]');
      if (go) go.addEventListener('click', () => switchTab('ranking'));
      return;
    }

    list.innerHTML = following.map(r => {
      const dms = Store.getDms(r.id);
      const last = dms[dms.length - 1];
      return `
        <div class="srow">
          <span class="srow-avatar srow-avatar-emoji" data-frame="${r.frame}">${r.emoji}</span>
          <span class="srow-meta">
            <span class="srow-name">${r.name}</span>
            <span class="srow-sub srow-lastmsg">${last ? (last.me ? 'あなた：' : '') + last.text : 'メッセージを送ってみよう'}</span>
          </span>
          <span class="srow-points"><strong>${rivalPoints(r).toLocaleString()}</strong><small>pt</small></span>
          <button type="button" class="srow-dm" data-dm="${r.id}">
            <svg class="icon icon-sm"><use href="#i-chat"/></svg> DM
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-dm]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab('dm');
        openThread(btn.dataset.dm);
      });
    });
  }

  /* ---------------- DM ---------------- */

  function renderDmTab() {
    const threads = document.getElementById('dmThreadList');
    const chat = document.getElementById('dmChat');
    if (!threads || !chat) return;

    if (openThreadId) {
      threads.hidden = true;
      chat.hidden = false;
      renderChat();
      return;
    }
    threads.hidden = false;
    chat.hidden = true;

    const following = Store.get().social.following.map(getRival).filter(Boolean);
    if (!following.length) {
      threads.innerHTML = `
        <div class="social-empty">
          <div class="social-empty-icon">💬</div>
          <p>メッセージできる相手がいません。<br>まずはランキングからフォローしてみよう！</p>
          <button type="button" class="btn btn-outline" data-social-go="ranking">ランキングを見る</button>
        </div>`;
      const go = threads.querySelector('[data-social-go]');
      if (go) go.addEventListener('click', () => switchTab('ranking'));
      return;
    }

    threads.innerHTML = following.map(r => {
      const dms = Store.getDms(r.id);
      const last = dms[dms.length - 1];
      return `
        <button type="button" class="dm-thread" data-thread="${r.id}">
          <span class="srow-avatar srow-avatar-emoji" data-frame="${r.frame}">${r.emoji}</span>
          <span class="srow-meta">
            <span class="srow-name">${r.name}</span>
            <span class="srow-sub srow-lastmsg">${last ? (last.me ? 'あなた：' : '') + last.text : 'まだメッセージはありません'}</span>
          </span>
          <svg class="icon icon-sm dm-thread-arrow"><use href="#i-arrow-right"/></svg>
        </button>
      `;
    }).join('');

    threads.querySelectorAll('[data-thread]').forEach(btn => {
      btn.addEventListener('click', () => openThread(btn.dataset.thread));
    });
  }

  function openThread(id) {
    openThreadId = id;
    renderDmTab();
    // Scroll chat to bottom after paint
    requestAnimationFrame(() => {
      const log = document.getElementById('dmLog');
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  function closeThread(rerender = true) {
    openThreadId = null;
    if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
    if (rerender) renderDmTab();
  }

  function renderChat() {
    const r = getRival(openThreadId);
    if (!r) { closeThread(); return; }

    const nameEl = document.getElementById('dmChatName');
    if (nameEl) nameEl.textContent = `${r.emoji} ${r.name}`;

    const log = document.getElementById('dmLog');
    if (!log) return;
    const dms = Store.getDms(r.id);
    log.innerHTML = dms.length
      ? dms.map(m => `
          <div class="dm-msg ${m.me ? 'me' : 'them'}">
            <span class="dm-bubble">${escapeHtml(m.text)}</span>
          </div>`).join('')
      : `<div class="dm-log-empty">「${r.name}」にメッセージを送ってみよう！</div>`;
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function sendDm() {
    const input = document.getElementById('dmInput');
    const r = getRival(openThreadId);
    if (!input || !r) return;
    const text = input.value.trim().slice(0, 200);
    if (!text) return;
    input.value = '';
    Store.addDm(r.id, { me: true, text, at: new Date().toISOString() });
    renderChat();

    // キャラクターからの自動返信（デモ）
    if (replyTimer) clearTimeout(replyTimer);
    replyTimer = setTimeout(() => {
      const count = Store.getDms(r.id).filter(m => !m.me).length;
      const line = r.lines[count % r.lines.length];
      Store.addDm(r.id, { me: false, text: line, at: new Date().toISOString() });
      if (openThreadId === r.id) renderChat();
    }, 1100 + Math.random() * 900);
  }

  /* ---------------- Render / init ---------------- */

  function render() {
    if (currentTab === 'ranking') renderRanking();
    else if (currentTab === 'friends') renderFriends();
    else renderDmTab();
  }

  function bind() {
    document.querySelectorAll('[data-social-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.socialTab));
    });
    const back = document.getElementById('dmBackBtn');
    if (back) back.addEventListener('click', () => closeThread());
    const send = document.getElementById('dmSendBtn');
    if (send) send.addEventListener('click', sendDm);
    const input = document.getElementById('dmInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendDm(); }
      });
    }
    // ページを離れたらスレッドを閉じる
    UI.on('page', (page) => {
      if (page !== 'social') closeThread(false);
    });
  }

  function init() {
    bind();
    render();
  }

  window.Social = { init, refresh: render };
})();
