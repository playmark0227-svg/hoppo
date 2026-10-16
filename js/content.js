/* Published content only; drafts and QR secrets never enter the public catalog. */
(function () {
  let revision = 0;
  const keys = { quizzes: 'QUIZZES', stamps: 'STAMPS', shop: 'SHOP_ITEMS', furusato: 'NEMURO_FURUSATO', islands: 'ISLANDS', ranks: 'RANKS' };
  function apply(catalog) {
    if (!catalog || !Number.isSafeInteger(catalog.revision) || !catalog.sources ||
        Object.keys(keys).some(key => !Array.isArray(catalog[key]))) throw new Error('公開データの形式を確認できません。');
    if (catalog.revision === revision) return;
    Object.entries(keys).forEach(([key, name]) => { window[name] = catalog[key]; });
    window.RANKS.sort((a, b) => a.min - b.min);
    window.QUIZ_SOURCES = catalog.sources;
    revision = catalog.revision;
    const news = document.querySelector('.news-list');
    if (news) {
      news.replaceChildren();
      (catalog.notices || []).forEach(item => {
        const li = document.createElement('li');
        const dot = document.createElement('span'); dot.className = 'news-dot';
        li.append(dot);
        if (item.url) {
          const link = document.createElement('a'); link.href = item.url; link.textContent = item.body || item.name;
          link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link);
        } else li.append(document.createTextNode(item.body || item.name));
        news.append(li);
      });
    }
    catalog.islands.forEach(island => document.querySelectorAll(`[data-island="${island.id}"]`).forEach(node => {
      if (node.classList.contains('place-card')) node.style.backgroundImage = `url('${island.image}')`;
      const name = node.querySelector('.place-card-name'); if (name) name.textContent = island.name;
      const desc = node.querySelector('.place-card-desc'); if (desc) desc.textContent = island.desc;
    }));
    if (window.Cloud?.account && window.Store) Store.applyRemote(Cloud.account, Cloud.user.uid, false);
    window.UI?.refreshHeader(); window.UI?.refreshHome();
    if (document.getElementById('quizPlay')?.hidden) window.Quiz?.refresh();
    window.Stamps?.refresh(); window.Shop?.refresh(); window.Shop?.renderFurusato(); window.License?.refresh(); window.Settings?.refresh();
  }
  window.Content = { apply, get revision() { return revision; } };
})();
