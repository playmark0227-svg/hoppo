/* ============================================================
   Static data — ranks, quizzes, shop items, QR codes
   ============================================================ */

window.RANKS = [
  {
    id: 'silver',
    emoji: '🐚',
    name: '島民見習い',
    sub: 'シルバーライセンス',
    en: 'SILVER APPRENTICE',
    min: 0,
    image: 'assets/images/hoppou/shikotan.jpg',
    color: '#c7d0dc',
    blurb: 'ようこそ！北方領土に興味を持ったあなたの第一歩。'
  },
  {
    id: 'gold',
    emoji: '🥇',
    name: '北方ナビゲーター',
    sub: 'ゴールドライセンス',
    en: 'GOLD NAVIGATOR',
    min: 100,
    image: 'assets/images/hoppou/kunashir-view.jpg',
    color: '#f6b93b',
    blurb: '基本を身につけた！仲間に教えられるレベル。'
  },
  {
    id: 'crab',
    emoji: '🦀',
    name: '花咲ガニ大使',
    sub: 'ハナサキライセンス',
    en: 'HANASAKI AMBASSADOR',
    min: 300,
    image: 'assets/images/hoppou/hanasaki-crab.jpg',
    color: '#f47a5a',
    blurb: '根室の名物、花咲ガニのように堂々と知識を広めよう。'
  },
  {
    id: 'clione',
    emoji: '💎',
    name: '流氷の守り手',
    sub: 'クリオネライセンス',
    en: 'CLIONE GUARDIAN',
    min: 800,
    image: 'assets/images/hoppou/clione.jpg',
    color: '#b9a6ff',
    blurb: 'オホーツクの天使・クリオネみたいに、美しく語ろう。'
  },
  {
    id: 'prime',
    emoji: '👑',
    name: '北方領土総理',
    sub: 'プライムライセンス',
    en: 'HOPPOU PRIME MINISTER',
    min: 2000,
    image: 'assets/images/hoppou/iturup-volcano.jpg',
    color: '#ff6fa4',
    blurb: '最高位！君こそ北方領土の顔だ！'
  }
];

window.QUIZZES = [
  {
    id: 'basics',
    title: '北方領土 基本クイズ',
    desc: '絶対に知っておきたい基本のキ',
    icon: '🗾',
    image: 'assets/images/hoppou/four-islands-map.png',
    questions: [
      {
        q: '北方領土は、いくつの島でできている？',
        choices: ['2つ', '3つ', '4つ', '5つ'],
        answer: 2,
        explain: '択捉島・国後島・色丹島・歯舞群島の4島をまとめて北方領土と呼ぶよ。'
      },
      {
        q: '北方領土のうち、いちばん大きな島はどれ？',
        choices: ['歯舞群島', '色丹島', '国後島', '択捉島'],
        answer: 3,
        explain: '択捉島（えとろふとう）は北方領土最大の島。本州の4分の1以上の大きさ！'
      },
      {
        q: '日本から北方領土に一番近い市はどこ？',
        choices: ['稚内市', '根室市', '釧路市', '函館市'],
        answer: 1,
        explain: '根室市（ねむろし）の納沙布岬から歯舞群島まで、たった3.7km！'
      },
      {
        q: '「北方領土の日」は何月何日？',
        choices: ['2月7日', '4月28日', '8月15日', '9月2日'],
        answer: 0,
        explain: '1855年2月7日、日魯通好条約が結ばれた日にちなんで制定。'
      },
      {
        q: '北方領土にかつて住んでいた日本人を何と呼ぶ？',
        choices: ['海士', '島民', '元島民', '開拓民'],
        answer: 2,
        explain: '戦前に住み、終戦後に引き揚げた人たちを「元島民」と呼ぶよ。'
      }
    ]
  },
  {
    id: 'history',
    title: '歴史のクイズ',
    desc: '昔、何があったんだろう？',
    icon: '📜',
    image: 'assets/images/hoppou/cape-nosappu.jpg',
    questions: [
      {
        q: '1855年に日本とロシアが結んだ、北方領土の国境を定めた条約は？',
        choices: ['日魯通好条約', '樺太・千島交換条約', 'ポーツマス条約', 'サンフランシスコ平和条約'],
        answer: 0,
        explain: '日魯通好条約で、択捉島とウルップ島の間が国境と定められた。'
      },
      {
        q: '1875年、日本が千島列島全体をロシアから得るかわりに手放したのは？',
        choices: ['北方四島', '樺太', '対馬', '千島列島南部'],
        answer: 1,
        explain: '樺太・千島交換条約で、日本は樺太（サハリン）を手放した。'
      },
      {
        q: '北方領土が不法に占拠されたのはいつ？',
        choices: ['1904年', '1941年', '1945年', '1956年'],
        answer: 2,
        explain: '1945年8〜9月、終戦直後にソ連軍が4島を占領した。'
      },
      {
        q: '1956年に結ばれ、平和条約の締結後に2島返還を明記しているのは？',
        choices: ['日ソ共同宣言', 'ヤルタ協定', '日米安全保障条約', '東京宣言'],
        answer: 0,
        explain: '日ソ共同宣言では、平和条約後に歯舞群島と色丹島を返還すると明記。'
      }
    ]
  },
  {
    id: 'nature',
    title: '自然・文化クイズ',
    desc: 'どんな島なんだろう？',
    icon: '🦭',
    image: 'assets/images/hoppou/drift-ice.jpg',
    questions: [
      {
        q: '北方領土の海によくいる、かわいい哺乳類は？',
        choices: ['アザラシ', 'パンダ', 'コアラ', 'カピバラ'],
        answer: 0,
        explain: 'ゴマフアザラシなど、たくさんのアザラシが生息しているよ。'
      },
      {
        q: '流氷が接岸する海は？',
        choices: ['日本海', '瀬戸内海', 'オホーツク海', '太平洋'],
        answer: 2,
        explain: 'オホーツク海の流氷は世界でも低緯度で見られる珍しいもの。'
      },
      {
        q: '根室名物で、北方領土の海でも獲れるカニは？',
        choices: ['タラバガニ', 'ズワイガニ', '花咲ガニ', '毛ガニ'],
        answer: 2,
        explain: '花咲ガニは根室のシンボル。濃厚でおいしい！'
      },
      {
        q: 'オホーツク海にいる、「流氷の天使」と呼ばれる生き物は？',
        choices: ['クリオネ', 'クラゲ', 'イルカ', 'シャチ'],
        answer: 0,
        explain: 'クリオネは小さな巻貝のなかま。妖精みたいにひらひら泳ぐよ。'
      }
    ]
  }
];

window.SHOP_ITEMS = [
  {
    id: 'sticker-erika',
    name: 'エリカちゃんステッカー',
    desc: 'ノートやPCに貼れるよ！',
    emoji: '✨',
    accent: 'cherry',
    price: 50,
    stock: 'infinite'
  },
  {
    id: 'badge-silver',
    name: 'シルバーバッジ',
    desc: 'プロフィールに飾れるバッジ',
    emoji: '🥈',
    accent: 'silver',
    price: 100,
    stock: 'infinite'
  },
  {
    id: 'plush-mini',
    name: 'ミニぬいぐるみ',
    desc: '手のひらサイズのエリカちゃん',
    emoji: '🧸',
    accent: 'coral',
    price: 300,
    stock: 'infinite'
  },
  {
    id: 'plush-big',
    name: 'ジャンボぬいぐるみ',
    desc: '抱きしめサイズ！',
    emoji: '🐻',
    accent: 'cherry',
    price: 800,
    stock: 'infinite'
  },
  {
    id: 'towel',
    name: 'オリジナルタオル',
    desc: '北方四島のイラスト入り',
    emoji: '🏳️',
    accent: 'ocean',
    price: 200,
    stock: 'infinite'
  },
  {
    id: 'mug',
    name: 'マグカップ',
    desc: '朝のココアにぴったり',
    emoji: '☕',
    accent: 'gold',
    price: 250,
    stock: 'infinite'
  },
  {
    id: 'book-picture',
    name: '絵本「四つの島」',
    desc: '優しく学べる絵本',
    emoji: '📖',
    accent: 'mint',
    price: 400,
    stock: 'infinite'
  },
  {
    id: 'tote',
    name: 'トートバッグ',
    desc: 'エリカちゃんプリント',
    emoji: '👜',
    accent: 'ocean',
    price: 500,
    stock: 'infinite'
  }
];

/* Demo QR codes — in real use, these would be validated server-side */
window.QR_CODES = {
  'HOPPOU-DEMO-50':     { label: 'デモ参加ボーナス',        points: 50 },
  'HOPPOU-EVENT-100':   { label: 'イベント参加ボーナス',    points: 100 },
  'HOPPOU-NEMURO-200':  { label: '根室ツアー参加ボーナス',   points: 200 },
  'HOPPOU-RALLY-150':   { label: '啓発ラリー参加ボーナス',  points: 150 },
  'HOPPOU-SCHOOL-80':   { label: '学校イベントボーナス',    points: 80 }
};

window.ISLANDS = [
  {
    id: 'etorofu',
    name: '択捉島',
    en: 'ETOROFU',
    kana: 'えとろふとう',
    desc: '北方四島で最大の島',
    image: 'assets/images/hoppou/iturup-volcano.jpg',
    facts: [
      { k: '面積', v: '3,167 km²' },
      { k: '本州との比較', v: '東京都の約1.5倍' },
      { k: '主な地形', v: '火山と湿原' },
      { k: '最高峰', v: '茂世路岳 1,124m' }
    ],
    body: '択捉島は北方領土最大の島で、活火山を抱える雄大な島です。戦前は日本人がサケ・マス漁や昆布漁を営み、内岡（紗那）には町がありました。豊かな自然が残り、ヒグマやキタキツネ、海鳥が暮らしています。'
  },
  {
    id: 'kunashiri',
    name: '国後島',
    en: 'KUNASHIRI',
    kana: 'くなしりとう',
    desc: '根室から望める雄大な島',
    image: 'assets/images/hoppou/kunashir-view.jpg',
    facts: [
      { k: '面積', v: '1,489 km²' },
      { k: '本州との比較', v: '沖縄本島より大きい' },
      { k: '根室からの距離', v: '約16 km' },
      { k: '最高峰', v: '爺爺岳 1,822m' }
    ],
    body: '国後島は根室半島から肉眼で見える距離にあり、爺爺岳（ちゃちゃだけ）という美しい火山がシンボルです。温泉や原生林が点在し、独特の生態系を持っています。'
  },
  {
    id: 'shikotan',
    name: '色丹島',
    en: 'SHIKOTAN',
    kana: 'しこたんとう',
    desc: '緑豊かな小さな島',
    image: 'assets/images/hoppou/shikotan.jpg',
    facts: [
      { k: '面積', v: '253 km²' },
      { k: '本州との比較', v: '東京23区の約4割' },
      { k: '最高峰', v: '斜古丹山 412m' },
      { k: '主な産業', v: '漁業（サケ・カニ）' }
    ],
    body: '色丹島は穏やかな入り江と緑豊かな丘陵が特徴の島です。戦前は穴澗（あなま）が中心地で、漁業と缶詰工場がありました。湿原には固有の植物も自生しています。'
  },
  {
    id: 'habomai',
    name: '歯舞群島',
    en: 'HABOMAI',
    kana: 'はぼまいぐんとう',
    desc: '日本本土から最も近い島々',
    image: 'assets/images/hoppou/cape-nosappu.jpg',
    facts: [
      { k: '面積', v: '94 km²（合計）' },
      { k: '島の数', v: '貝殻島など6島群' },
      { k: '納沙布岬から', v: '約3.7 km' },
      { k: '主な産業', v: '昆布漁' }
    ],
    body: '歯舞群島は北海道納沙布岬の沖合にある小さな島々の集まりです。最も近い貝殻島は、納沙布岬からわずか3.7km。戦前は多くの人が昆布漁で暮らしていました。'
  }
];

window.getIslandById = function(id) {
  return (window.ISLANDS || []).find(i => i.id === id) || null;
};

window.getRankByPoints = function(points) {
  let current = window.RANKS[0];
  for (const r of window.RANKS) {
    if (points >= r.min) current = r;
  }
  return current;
};

window.getNextRank = function(points) {
  for (const r of window.RANKS) {
    if (points < r.min) return r;
  }
  return null; // already max
};

window.getRankIndex = function(rankId) {
  return window.RANKS.findIndex(r => r.id === rankId);
};
