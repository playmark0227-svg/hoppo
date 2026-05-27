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
        const shortage = item.price - s.points;
        const btnLabel = owned ? '獲得済' : (canBuy ? '交換する' : `あと ${shortage.toLocaleString()}pt`);
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
              <span class="shop-item-price"><svg class="icon icon-sm"><use href="#i-star"/></svg> ${item.price.toLocaleString()}pt</span>
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

  /* ---------------- Furusato (ふるさと納税) ---------------- */

  function bindTabs() {
    document.querySelectorAll('[data-shop-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.shopTab));
    });
  }

  function switchTab(which) {
    document.querySelectorAll('.shop-tab').forEach(t => {
      const active = t.dataset.shopTab === which;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const points = document.getElementById('shopPanelPoints');
    const furu   = document.getElementById('shopPanelFurusato');
    if (points && furu) {
      const isPoints = which === 'points';
      points.classList.toggle('active', isPoints);
      furu.classList.toggle('active', !isPoints);
      points.hidden = !isPoints;
      furu.hidden = isPoints;
    }
    if (which === 'furusato') renderFurusato();
  }

  function renderFurusato() {
    const grid = document.getElementById('furusatoGrid');
    if (!grid) return;
    const items = window.NEMURO_FURUSATO || [];
    grid.innerHTML = items.map(item => `
      <div class="furusato-item" data-accent="${item.accent || 'coral'}">
        <div class="furusato-item-img">
          <span class="furusato-item-emoji">${item.emoji}</span>
          <span class="furusato-item-cat">${item.category}</span>
        </div>
        <div class="furusato-item-name">${item.name}</div>
        <div class="furusato-item-desc">${item.desc}</div>
        <div class="furusato-item-foot">
          <span class="furusato-item-amount">寄附 ¥${item.amount.toLocaleString()}〜</span>
          <button class="furusato-item-btn" data-furusato="${item.id}">詳細</button>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('[data-furusato]').forEach(btn => {
      btn.addEventListener('click', () => openFurusatoDetail(btn.dataset.furusato));
    });
  }

  function openFurusatoDetail(itemId) {
    const item = (window.NEMURO_FURUSATO || []).find(i => i.id === itemId);
    if (!item) return;
    const ok = confirm(
      `「${item.name}」\n寄附金額の目安: ¥${item.amount.toLocaleString()}〜\n\n` +
      `${item.desc}\n\n` +
      `公式のふるさと納税ポータルで詳細を確認しますか？`
    );
    if (ok) {
      window.open('https://www.furusato-tax.jp/city/info/01223', '_blank', 'noopener');
    }
  }

  function init() {
    bindTabs();
    render();
  }

  window.Shop = { init, refresh: render, renderFurusato };
})();
