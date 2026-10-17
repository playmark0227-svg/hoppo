/* ============================================================
   App — bootstrap, routing, global listeners
   ============================================================ */
(function() {
  function bindNav() {
    document.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', (e) => {
        const page = el.dataset.goto;
        UI.go(page);
        if (page === 'quiz') Quiz.refresh();
        if (page === 'shop') Shop.refresh();
        if (page === 'license') License.refresh();
        if (page === 'settings' && window.Settings) Settings.refresh();
        if (page === 'stamps' && window.Stamps) Stamps.refresh();
        if (page === 'social' && window.Social) {
          // タブ直行（例：ボトムナビの「メッセージ」→ DMタブ）
          if (el.dataset.socialOpen) Social.openTab(el.dataset.socialOpen);
          else Social.refresh();
        }
      });
    });
  }

  function bindStore() {
    Store.on('change', () => {
      UI.refreshHeader();
    });
    Store.on('points', ({ points, info }) => {
      UI.flashPoints();
    });
  }

  function bindIslands() {
    document.querySelectorAll('[data-island]').forEach(el => {
      // Skip island-picker chips (those have a dedicated handler)
      if (el.classList.contains('island-chip')) return;
      el.addEventListener('click', () => {
        UI.showIsland(el.dataset.island);
      });
    });
  }

  function bindAchieveTiles() {
    const grid = document.getElementById('achieveGrid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('[data-id]');
      if (!tile) return;
      const id = tile.dataset.id;
      const def = (window.Achievements?.getDefs() || []).find(d => d.id === id);
      const earned = (window.Achievements?.getEarned() || []).some(d => d.id === id);
      if (def) UI.showAchieveDetail(def, earned);
    });
  }

  function bindHistoryChip() {
    ['pointsChip', 'dsPointsCard'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => UI.showHistory());
    });
  }

  function bindStatTaps() {
    document.querySelectorAll('[data-stat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.stat;
        const s = Store.get();
        switch (kind) {
          case 'quizzes': {
            const total = Object.values(s.quizResults || {}).reduce((sum, r) => sum + (r.timesPlayed || 0), 0);
            UI.toast(`これまでに ${total} 回クイズに挑戦しました`, 'good');
            break;
          }
          case 'events': {
            UI.toast(`イベント参加数：${(s.usedQrCodes || []).length} 回`, 'good');
            break;
          }
          case 'streak': {
            UI.toast(`連続ログイン ${s.loginStreak || 0} 日（最長 ${s.longestStreak || 0} 日）`, 'good');
            break;
          }
          case 'total': {
            UI.showHistory();
            break;
          }
        }
      });
    });
  }

  function bindHeroBubble() {
    const bubble = document.getElementById('heroBubble');
    if (!bubble) return;
    bubble.addEventListener('click', () => {
      UI.refreshHome(); // re-rolls a random message
    });
  }

  function applyAvatarStyleFromStore() {
    const p = Store.getProfile();
    [
      document.getElementById('topbarAvatar'),
      document.getElementById('settingsPreviewAvatar'),
      document.getElementById('profileShortcutAvatar'),
      document.getElementById('dsProfileAvatar')
    ].forEach(el => {
      if (!el) return;
      el.dataset.frame = p.avatarFrame || 'coral';
      el.dataset.pattern = p.avatarPattern || 'wave';
    });
    // Apply visual prefs (motion / contrast)
    const settings = Store.getSettings();
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.documentElement.classList.toggle('high-contrast', !!settings.highContrast);

    // 島カラー着せ替え — 推しの島のパレットをアプリ全体に適用
    const themeOn = !!p.islandThemeOn;
    document.documentElement.dataset.islandTheme = themeOn ? (p.favoriteIsland || '') : '';
  }

  const loader = document.getElementById('loader');
  let loaderTimer;
  function showLoader(message = 'アカウントのデータを読み込んでいます…') {
    if (!loader) return;
    clearTimeout(loaderTimer);
    if (!loader.isConnected) document.body.append(loader);
    loader.classList.remove('hide');
    document.getElementById('loaderStatus').textContent = message;
    document.getElementById('loaderRetry').hidden = true;
  }
  function finishLoading(outcome) {
    if (!loader || loader.classList.contains('hide')) return;
    clearTimeout(loaderTimer);
    loader.classList.add('hide');
    loaderTimer = setTimeout(() => {
      loader.remove();
      if (outcome === 'action') Cloud.open();
    }, 650);
  }
  function loadingError() {
    showLoader('アカウントデータを読み込めませんでした。通信を確認して再試行してください。');
    document.getElementById('loaderRetry').hidden = false;
  }
  window.App = { showLoader, finishLoading, loadingError };

  function handleInitialRoute() {
    const hash = (location.hash || '#home').replace('#', '');
    const valid = ['home', 'quiz', 'qr', 'shop', 'license', 'settings', 'stamps', 'social', 'admin'];
    UI.go(valid.includes(hash) ? hash : 'home');
  }

  function showFileNotice() {
    const main = document.createElement('main');
    main.className = 'file-entry';
    const icon = document.createElement('img');
    icon.src = 'assets/images/icon-192.png'; icon.alt = ''; icon.width = 88; icon.height = 88;
    const title = document.createElement('h1'); title.textContent = '北方領土ステータス';
    const message = document.createElement('p');
    message.textContent = '端末内のファイルを直接開いています。ログインと学習記録の読み込みには、公開サイトを開いてください。';
    const link = document.createElement('a');
    const route = (location.hash || '#home').slice(1);
    const routes = ['home', 'quiz', 'qr', 'shop', 'license', 'settings', 'stamps', 'social', 'admin'];
    link.href = `https://hoppo-status.vifight.com/#${routes.includes(route) ? route : 'home'}`;
    link.textContent = '公開サイトを開く';
    const domain = document.createElement('p'); domain.className = 'file-entry-domain';
    domain.textContent = 'hoppo-status.vifight.com';
    main.append(icon, title, message, link, domain);
    document.body.className = 'file-entry-body';
    document.body.replaceChildren(main);
    document.title = '公開サイトのご案内｜北方領土ステータス';
  }

  function init() {
    if (location.protocol === 'file:') {
      showFileNotice();
      return;
    }
    if (window.self !== window.top) {
      const link = document.createElement('a');
      link.href = location.origin + location.pathname;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = '北方領土ステータスを開く';
      document.body.replaceChildren(link);
      return;
    }
    Store.init();
    bindNav();
    bindStore();
    bindIslands();
    bindAchieveTiles();
    bindHistoryChip();
    bindStatTaps();
    bindHeroBubble();
    applyAvatarStyleFromStore();

    UI.refreshHeader();
    UI.refreshHome();

    Quiz.init();
    Shop.init();
    QR.init();
    License.init();
    if (window.Settings) Settings.init();
    if (window.Stamps) Stamps.init();
    if (window.Social) Social.init();
    if (window.Tutorial) Tutorial.init();
    if (window.Admin) Admin.init();
    const cloudBoot = window.Cloud ? Cloud.init() : Promise.resolve('preview');

    // Re-apply avatar style after Store changes (e.g. import)
    Store.on('change', applyAvatarStyleFromStore);

    // Daily login bonus — open welcome modal if claimed
    // （初回はチュートリアルを優先し、ボーナス付与のみ行う）
    const daily = window.Cloud?.enabled ? null : Store.claimDailyLogin();
    if (daily && Store.getFlag('tutorialSeen')) {
      setTimeout(() => {
        UI.showDailyWelcome(daily);
        UI.refreshHeader();
        UI.refreshHome();
      }, 800);
    }

    // Evaluate achievements on boot (in case data reached a threshold via other means)
    if (window.Achievements) window.Achievements.evaluateAll();

    handleInitialRoute();
    document.getElementById('loaderRetry').addEventListener('click', () => location.reload());
    let startupFinished = false;
    const timeout = setTimeout(() => {
      if (!startupFinished) { startupFinished = true; loadingError(); }
    }, 20000);
    Promise.resolve(cloudBoot).then(outcome => {
      if (startupFinished) return;
      startupFinished = true; clearTimeout(timeout);
      finishLoading(outcome);
    }, error => {
      if (startupFinished) return;
      startupFinished = true; clearTimeout(timeout);
      console.error('Account startup failed:', error);
      loadingError();
    });

    // hash-based back/forward
    window.addEventListener('hashchange', handleInitialRoute);

    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // Only over http(s) — skip file:// previews
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
