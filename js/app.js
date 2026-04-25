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

  function hideLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    setTimeout(() => loader.classList.add('hide'), 500);
    setTimeout(() => loader.remove(), 1200);
  }

  function handleInitialRoute() {
    const hash = (location.hash || '#home').replace('#', '');
    const valid = ['home', 'quiz', 'qr', 'shop', 'license'];
    UI.go(valid.includes(hash) ? hash : 'home');
  }

  function init() {
    Store.init();
    bindNav();
    bindStore();

    UI.refreshHeader();
    UI.refreshHome();

    Quiz.init();
    Shop.init();
    QR.init();
    License.init();

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
