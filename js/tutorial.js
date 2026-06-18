/* ============================================================
   Tutorial — 初回オンボーディング
   初めての利用者にアプリの目的と機能・操作を案内する。
   設定 → アプリについて から再表示可能。
   ============================================================ */
(function() {

  const SLIDES = [
    {
      icon: '🐧',
      title: 'ようこそ！\n北方領土ステータスへ',
      body: '北方領土のことを、クイズやスタンプで楽しく学べるアプリです。マスコットキャラクターが案内します。登録もログインも不要、データはこの端末の中だけに保存されます。',
      erika: true
    },
    {
      icon: '📝',
      title: 'クイズでポイントGET',
      body: '6カテゴリ・全47問のクイズに挑戦！正解するとポイントがもらえて、全問正解ならボーナス +50pt。歴史・自然・島の暮らしまで、日本側の正しい知識が身につきます。'
    },
    {
      icon: '📍',
      title: 'QRコード＆スタンプラリー',
      body: '画面下の真ん中のボタンからQRコードを読み取れます。イベント会場のQRでポイント獲得、根室・北方領土ゆかりの地ではご当地スタンプも！スタンプは「スタンプ」タブで図鑑のように集められます。'
    },
    {
      icon: '🎁',
      title: 'ポイントでお買い物',
      body: '貯めたポイントは「ショップ」でグッズと交換できます。「ふるさと納税」タブでは、北方領土返還運動の拠点・根室市を応援する入り口も用意しています。'
    },
    {
      icon: '🪪',
      title: 'ランクアップ＆着せ替え',
      body: '累計ポイントで「島民見習い」から「北方領土総理」まで5段階に昇格！設定で推しの島を選ぶと、アプリ全体があなたの島のカラーに着せ替わります。'
    },
    {
      icon: '🏆',
      title: 'ランキング＆フレンド',
      body: '「ランキング」では仲間とポイントを競えます。気になる相手をフォローしてメッセージも送れます（アプリ内キャラクターとのデモ機能・外部送信なし）。さあ、はじめよう！'
    }
  ];

  let idx = 0;

  function el(id) { return document.getElementById(id); }

  function renderSlide() {
    const s = SLIDES[idx];
    const iconEl = el('tutIcon');
    const titleEl = el('tutTitle');
    const bodyEl = el('tutBody');
    const erikaEl = el('tutErika');
    const card = el('tutCard');

    if (iconEl) iconEl.textContent = s.icon;
    if (titleEl) titleEl.innerHTML = s.title.replace(/\n/g, '<br>');
    if (bodyEl) bodyEl.textContent = s.body;
    if (erikaEl) erikaEl.hidden = !s.erika;
    if (iconEl) iconEl.hidden = !!s.erika;

    // dots
    const dots = el('tutDots');
    if (dots) {
      dots.innerHTML = SLIDES.map((_, i) =>
        `<span class="tut-dot ${i === idx ? 'active' : ''}"></span>`).join('');
    }

    // buttons
    const next = el('tutNextBtn');
    if (next) next.textContent = idx === SLIDES.length - 1 ? 'はじめる！' : '次へ';
    const skip = el('tutSkipBtn');
    if (skip) skip.hidden = idx === SLIDES.length - 1;
    const prev = el('tutPrevBtn');
    if (prev) prev.style.visibility = idx === 0 ? 'hidden' : 'visible';

    // re-trigger slide-in animation
    if (card) {
      card.classList.remove('tut-anim');
      void card.offsetWidth;
      card.classList.add('tut-anim');
    }
  }

  function show(force = false) {
    if (!force && Store.getFlag('tutorialSeen')) return;
    const overlay = el('tutorialOverlay');
    if (!overlay) return;
    idx = 0;
    renderSlide();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.classList.add('no-scroll');
  }

  function hide() {
    const overlay = el('tutorialOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { overlay.hidden = true; }, 350);
    document.body.classList.remove('no-scroll');
    Store.setFlag('tutorialSeen', true);
  }

  function next() {
    if (idx >= SLIDES.length - 1) { hide(); return; }
    idx++;
    renderSlide();
  }

  function prev() {
    if (idx <= 0) return;
    idx--;
    renderSlide();
  }

  function bind() {
    const nextBtn = el('tutNextBtn');
    const prevBtn = el('tutPrevBtn');
    const skipBtn = el('tutSkipBtn');
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (skipBtn) skipBtn.addEventListener('click', () => {
      if (confirm('チュートリアルをスキップしますか？\n（設定からいつでも見直せます）')) hide();
    });
  }

  function init() {
    bind();
    // 初回のみ、ローダー後に少し置いて表示
    setTimeout(() => show(false), 1100);
  }

  window.Tutorial = { init, show };
})();
