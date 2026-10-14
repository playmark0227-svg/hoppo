/* ============================================================
   Tutorial — 初回オンボーディング
   初めての利用者にアプリの目的と機能・操作を案内する。
   設定 → アプリについて から再表示可能。
   ============================================================ */
(function() {

  const SLIDES = [
    {
      icon: '🐻',
      title: 'ようこそ！\n北方領土ステータスへ',
      body: window.Cloud?.enabled
        ? '北方領土のことを、クイズやスタンプで楽しく学べるアプリです。メールアドレスで登録し、確認メールのリンクを開くと、ポイントや学習記録をFirebaseに保存できます。公開設定やデータの扱いは登録前に確認してください。'
        : '北方領土のことを、クイズやスタンプで楽しく学べるアプリです。現在は画面のプレビューで、登録・利用者同士の通信は準備中です。マスコットの「しろくまくん」が案内します。',
      mascot: true
    },
    {
      icon: '📝',
      title: 'クイズでポイントGET',
      body: '6カテゴリ・全47問のクイズに挑戦できます。正解・全問正解でポイントを獲得。同じ問題の同じ版では、ベスト成績が向上した分だけ加算されます。地理・歴史・自然などを学び、更新された問題にも挑戦してみましょう。'
    },
    {
      icon: '📍',
      title: 'QRコード＆スタンプラリー',
      body: '画面下の真ん中のボタンからQRコードを読み取れます。イベント会場のQRでポイント獲得、根室・北方領土ゆかりの地ではご当地スタンプも！スタンプは「スタンプ」タブで図鑑のように集められます。'
    },
    {
      icon: '🎁',
      title: 'ポイントでお買い物',
      body: window.Cloud?.enabled
        ? 'グッズのポイント交換・配送・送料決済は準備中です。「ふるさと納税」タブからは、根室市の返礼品や外部の寄附サイトを確認できます。寄附の申込みや支払いはリンク先で行います。'
        : '「ショップ」はグッズ交換の画面プレビューです。実際の商品発送や送料決済は行われません。「ふるさと納税」タブでは根室市の外部寄附サイトを案内しています。'
    },
    {
      icon: '🪪',
      title: 'ランクアップ＆着せ替え',
      body: '累計ポイントで「島民見習い」から「北方領土総理」まで5段階に昇格！設定で推しの島を選ぶと、アプリ全体があなたの島のカラーに着せ替わります。'
    },
    {
      icon: '🏆',
      title: 'ランキング＆フレンド',
      body: window.Cloud?.enabled
        ? '設定でランキング公開を選ぶと、登録名と累計獲得ポイントを公開できます。フォローした相手とのDMは、双方が18歳以上でDMを有効にし、相互フォローしている場合に利用できます。DMはFirebaseに保存されます。'
        : '利用者同士のランキング・フォロー・DMは、本番のログイン接続後に利用できます。現在のプレビューに架空の競争相手や自動返信はありません。'
    }
  ];

  let idx = 0;

  function el(id) { return document.getElementById(id); }

  function renderSlide() {
    const s = SLIDES[idx];
    const iconEl = el('tutIcon');
    const titleEl = el('tutTitle');
    const bodyEl = el('tutBody');
    const mascotEl = el('tutMascot');
    const card = el('tutCard');

    if (iconEl) iconEl.textContent = s.icon;
    if (titleEl) titleEl.innerHTML = s.title.replace(/\n/g, '<br>');
    if (bodyEl) bodyEl.textContent = s.body;
    if (mascotEl) mascotEl.hidden = !s.mascot;
    if (iconEl) iconEl.hidden = !!s.mascot;

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
