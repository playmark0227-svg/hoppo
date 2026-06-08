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
  }

  function hideLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('hide'), 500);
    setTimeout(() => loader.remove(), 1200);
  }

  function handleInitialRoute() {
    const hash = (location.hash || '#home').replace('#', '');
    const valid = ['home', 'quiz', 'qr', 'shop', 'license', 'settings'];
    UI.go(valid.includes(hash) ? hash : 'home');
  }

  function init() {
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

    // Re-apply avatar style after Store changes (e.g. import)
    Store.on('change', applyAvatarStyleFromStore);

    // Daily login bonus — open welcome modal if claimed
    const daily = Store.claimDailyLogin();
    if (daily) {
      setTimeout(() => {
        UI.showDailyWelcome(daily);
        UI.refreshHeader();
        UI.refreshHome();
      }, 800);
    }

    // Evaluate achievements on boot (in case data reached a threshold via other means)
    if (window.Achievements) window.Achievements.evaluateAll();

    handleInitialRoute();
    hideLoader();

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
