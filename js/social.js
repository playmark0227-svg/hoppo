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

  function getStandings() {
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
    return entries;
  }

  function renderRanking() {
    const list = document.getElementById('rankingList');
    if (!list) return;

    const entries = getStandings();
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
            <span class="srow-name">${escapeHtml(e.name)}${e.me ? '<small class="srow-you">あなた</small>' : ''}</span>
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
            <span class="srow-name">${escapeHtml(r.name)}</span>
            <span class="srow-sub srow-lastmsg">${last ? (last.me ? 'あなた：' : '') + escapeHtml(last.text) : 'メッセージを送ってみよう'}</span>
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

  function hasUnreadDm() {
    const social = Store.get().social;
    const seen = social.dmSeenAt || '';
    return Object.values(social.dms || {}).some(thread =>
      thread.some(m => !m.me && (!seen || m.at > seen))
    );
  }

  function markDmSeen() {
    // 未読が無ければ何もしない（無駄なlocalStorage書き込みを避ける）
    if (!hasUnreadDm()) return;
    Store.state.social.dmSeenAt = new Date().toISOString();
    Store.saveOnly();          // 'change' 連鎖を起こさず保存だけ
    updateDmBadge();
  }

  /** 未読DM（自分宛て・最後に見た時刻より新しい）があればナビに赤ドット */
  function updateDmBadge() {
    const dot = document.getElementById('navDmDot');
    if (!dot) return;
    dot.hidden = !hasUnreadDm();
  }

  function renderDmTab() {
    const threads = document.getElementById('dmThreadList');
    const chat = document.getElementById('dmChat');
    if (!threads || !chat) return;

    // メッセージタブを開いた＝既読
    markDmSeen();

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
            <span class="srow-name">${escapeHtml(r.name)}</span>
            <span class="srow-sub srow-lastmsg">${last ? (last.me ? 'あなた：' : '') + escapeHtml(last.text) : 'まだメッセージはありません'}</span>
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
    // replyTimer はあえて止めない：送信直後に画面を離れても自動返信は保存され、
    // 未読バッジで気づける（renderChat 側の openThreadId ガードが描画競合を防ぐ）。
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
    // チャットを開いている間に届いた返信も既読扱い
    markDmSeen();
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

  /* ---------------- Home widget（ホーム常設ウィジェット） ---------------- */

  function renderHomeWidget() {
    const podium = document.getElementById('homePodium');
    const meRow = document.getElementById('homeMyRank');
    if (!podium && !meRow) return;

    const entries = getStandings();
    const myIdx = entries.findIndex(e => e.me);
    const myRank = myIdx + 1;
    const me = entries[myIdx];
    const avatarSrc = (Store.getProfile().avatarImage) || 'assets/characters/erika-main.png';

    if (podium) {
      const top3 = entries.slice(0, 3);
      // 表彰台の並び：2位・1位・3位
      const order = [top3[1], top3[0], top3[2]].filter(Boolean);
      const places = ['second', 'first', 'third'];
      const medals = { first: '🥇', second: '🥈', third: '🥉' };
      podium.innerHTML = order.map((e, i) => {
        const place = places[i];
        const face = e.me
          ? `<span class="podium-face avatar" data-frame="${e.frame}"><img src="${avatarSrc}" alt=""></span>`
          : `<span class="podium-face podium-face-emoji" data-frame="${e.frame}">${e.emoji}</span>`;
        return `
          <div class="podium-col ${place} ${e.me ? 'is-me' : ''}">
            <span class="podium-medal">${medals[place]}</span>
            ${face}
            <span class="podium-name">${e.me ? 'あなた' : escapeHtml(e.name)}</span>
            <span class="podium-pts">${e.points.toLocaleString()}<small>pt</small></span>
            <span class="podium-base"></span>
          </div>
        `;
      }).join('');
    }

    if (meRow) {
      if (myRank <= 3) {
        meRow.innerHTML = `
          <span class="home-myrank-label">🎉 あなたはいま <strong>TOP${myRank}</strong>！この調子！</span>
          <svg class="icon icon-sm"><use href="#i-arrow-right"/></svg>`;
      } else {
        const above = entries[myIdx - 1];
        const gap = above ? (above.points - me.points + 1) : 0;
        meRow.innerHTML = `
          <span class="home-myrank-label">あなたの順位：<strong>${myRank}位</strong><small> / ${entries.length}人中</small></span>
          <span class="home-myrank-gap">あと ${gap.toLocaleString()}pt で ${above ? escapeHtml(above.name) : ''} を抜ける！</span>
          <svg class="icon icon-sm"><use href="#i-arrow-right"/></svg>`;
      }
    }

    const fc = document.getElementById('homeFriendCount');
    if (fc) {
      const n = Store.get().social.following.length;
      fc.textContent = n > 0 ? ` ${n}人` : '';
    }
  }

  function bindHomeWidget() {
    const card = document.getElementById('homeSocialCard');
    if (!card) return;
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-social-open]');
      if (!btn) return;
      UI.go('social');
      switchTab(btn.dataset.socialOpen);
    });
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
    // ページを離れたらスレッドを閉じる／ホームに戻ったらウィジェット更新
    UI.on('page', (page) => {
      if (page !== 'social') closeThread(false);
      if (page === 'home') renderHomeWidget();
    });
  }

  function init() {
    bind();
    bindHomeWidget();
    render();
    renderHomeWidget();
    updateDmBadge();
    // ポイント・フォロー・名前の変化をウィジェットに反映
    Store.on('change', renderHomeWidget);
    // 新着DMで未読バッジを更新（メッセージタブ表示中は既読化される）
    Store.on('dm', updateDmBadge);
  }

  window.Social = { init, refresh: render, openTab: switchTab, getStandings, renderHomeWidget };
})();
