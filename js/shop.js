/* ============================================================
   Shop — grid, purchase, history
   ============================================================ */
(function() {
  function priceTier(price) {
    if (price < 100) return 'ENTRY';
    if (price < 300) return 'NORMAL';
    if (price < 500) return 'RARE';
    if (price < 800) return 'EPIC';
    return 'LEGEND';
  }

  function render() {
    const s = Store.get();
    const balanceEl = document.getElementById('shopBalance');
    if (balanceEl) balanceEl.textContent = s.points.toLocaleString();

    const grid = document.getElementById('shopGrid');
    if (grid) {
      grid.innerHTML = window.SHOP_ITEMS.map(item => {
        const owned = Store.ownsItem(item.id);
        const canBuy = s.points >= item.price;
        const state = owned ? 'owned' : (canBuy ? '' : 'locked');
        const btnLabel = owned ? 'こうかん済' : `${item.price}pt`;
        const accent = item.accent || 'coral';
        return `
          <div class="shop-item ${state}" data-item="${item.id}" data-accent="${accent}">
            <div class="shop-item-img">
              <span class="shop-item-emoji">${item.emoji}</span>
              <span class="shop-item-sticker">${priceTier(item.price)}</span>
            </div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-desc">${item.desc}</div>
            <div class="shop-item-foot">
              <span class="shop-item-price">⭐ ${item.price.toLocaleString()}pt</span>
              <button class="shop-item-btn" ${owned || !canBuy ? 'disabled' : ''}
                data-buy="${item.id}">${btnLabel}</button>
            </div>
            ${owned ? '<div class="shop-item-owned-stamp">獲得済</div>' : ''}
          </div>
        `;
      }).join('');
      grid.querySelectorAll('[data-buy]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          buy(btn.dataset.buy);
        });
      });
    }

    renderHistory();
  }

  function renderHistory() {
    const ul = document.getElementById('shopHistory');
    if (!ul) return;
    const s = Store.get();
    const purchases = s.history.filter(h => h.type === 'spend').slice(0, 10);
    if (purchases.length === 0) {
      ul.innerHTML = `<li class="shop-history-empty">まだ交換したアイテムはありません</li>`;
      return;
    }
    ul.innerHTML = purchases.map(h => {
      const d = new Date(h.at);
      const date = `${d.getMonth() + 1}/${d.getDate()}`;
      return `<li><span>${date} ${h.label}</span><strong>${h.points}pt</strong></li>`;
    }).join('');
  }

  function buy(itemId) {
    const item = window.SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (Store.ownsItem(itemId)) {
      UI.toast('既に獲得済みです');
      return;
    }
    const ok = confirm(`「${item.name}」を ${item.price}pt で交換しますか？`);
    if (!ok) return;
    const success = Store.spendPoints(item.price, { type: 'spend', label: item.name });
    if (!success) {
      UI.toast('ポイントが足りません…', 'bad');
      return;
    }
    Store.ownItem(itemId);
    UI.confetti({ count: 50 });
    UI.toast(`${item.name} を獲得しました！🎁`, 'good', 2800);
    UI.refreshHeader();
    render();
  }

  window.Shop = { init: render, refresh: render };
})();
