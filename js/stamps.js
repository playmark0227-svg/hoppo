/* ============================================================
   Stamps — ご当地スタンプラリー（図鑑形式）
   QRコード読み取りで取得。タップで場所の詳細を表示。
   ============================================================ */
(function() {

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function render() {
    const grid = document.getElementById('stampGrid');
    const counter = document.getElementById('stampCounter');
    const fill = document.getElementById('stampProgressFill');
    if (!grid) return;

    const stamps = window.STAMPS || [];
    const earned = stamps.filter(s => Store.hasStamp(s.id)).length;

    if (counter) counter.textContent = `${earned} / ${stamps.length}`;
    if (fill) fill.style.width = stamps.length ? `${(earned / stamps.length) * 100}%` : '0%';

    grid.innerHTML = stamps.map(s => {
      const got = Store.hasStamp(s.id);
      const at = got ? Store.get().stamps[s.id] : null;
      return `
        <button type="button" class="stamp-cell ${got ? 'earned' : 'locked'}" data-stamp="${s.id}"
                aria-label="${got ? s.name : '未取得スタンプ No.' + s.no}">
          <span class="stamp-no">No.${String(s.no).padStart(2, '0')}</span>
          <span class="stamp-seal" data-color="${s.color}">
            <span class="stamp-seal-emoji">${got ? s.emoji : '？'}</span>
          </span>
          <span class="stamp-cell-name">${got ? s.name : '？？？'}</span>
          <span class="stamp-cell-sub">${got ? fmtDate(at) : 'タップでヒント'}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-stamp]').forEach(btn => {
      btn.addEventListener('click', () => showDetail(btn.dataset.stamp));
    });

    renderDemoCodes();
  }

  function showDetail(id) {
    const s = window.getStampById(id);
    if (!s) return;
    const got = Store.hasStamp(id);
    const at = got ? Store.get().stamps[id] : null;

    const photo = document.getElementById('stampPhoto');
    if (photo) {
      if (got && s.image) {
        photo.style.backgroundImage = `url('${s.image}')`;
        photo.classList.remove('stamp-photo-emoji');
        photo.textContent = '';
      } else {
        photo.style.backgroundImage = '';
        photo.classList.add('stamp-photo-emoji');
        photo.textContent = got ? s.emoji : '🔍';
      }
      photo.dataset.color = s.color || 'coral';
      photo.classList.toggle('is-locked', !got);
    }

    const kicker = document.getElementById('stampKicker');
    if (kicker) kicker.textContent = `STAMP No.${String(s.no).padStart(2, '0')}${got ? '' : '（未取得）'}`;

    const title = document.getElementById('stampModalTitle');
    if (title) title.textContent = got ? `${s.name}` : '？？？';

    const sub = document.getElementById('stampSub');
    if (sub) sub.textContent = got ? `${s.kana}｜${s.area}` : `エリア：${s.area}`;

    const facts = document.getElementById('stampFacts');
    if (facts) {
      facts.innerHTML = got
        ? s.facts.map(f => `<li><span>${f.k}</span><strong>${f.v}</strong></li>`).join('')
          + `<li><span>取得日</span><strong>${fmtDate(at)}</strong></li>`
        : `<li><span>ヒント</span><strong>${s.desc}</strong></li>`;
    }

    const body = document.getElementById('stampBody');
    if (body) {
      body.textContent = got
        ? s.body
        : `このスタンプは「${s.area}」エリアのイベント・施設に設置されたQRコードを読み取ると取得できます。現地に行った気分で、デモコードでも体験できます。`;
    }

    UI.openModal('stampModal');
  }

  function renderDemoCodes() {
    const wrap = document.getElementById('stampDemoList');
    if (!wrap) return;
    const codes = Object.entries(window.STAMP_CODES || {});
    wrap.innerHTML = codes.map(([code, id]) => {
      const s = window.getStampById(id);
      const got = Store.hasStamp(id);
      return `
        <button type="button" class="stamp-demo-chip ${got ? 'used' : ''}" data-demo-stamp="${code}" ${got ? 'disabled' : ''}>
          <span>${s ? s.emoji : '📍'} ${s ? s.name : code}</span>
          <small>${got ? '取得済' : code}</small>
        </button>
      `;
    }).join('');
    wrap.querySelectorAll('[data-demo-stamp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.demoStamp;
        if (confirm(`デモコード「${code}」を使用してスタンプを取得しますか？`)) {
          if (window.QR && QR.redeem) QR.redeem(code);
        }
      });
    });
  }

  function bind() {
    const toggle = document.getElementById('stampDemoToggle');
    const box = document.getElementById('stampDemoBox');
    if (toggle && box) {
      toggle.addEventListener('click', () => {
        const open = !box.hidden;
        box.hidden = open;
        toggle.classList.toggle('open', !open);
      });
    }
    // Re-render when stamps change
    Store.on('stamp', render);
  }

  function init() {
    bind();
    render();
  }

  // UI hook so qr.js can pop the detail modal after earning
  if (window.UI) UI.showStamp = showDetail;

  window.Stamps = { init, refresh: render, showDetail };
})();
