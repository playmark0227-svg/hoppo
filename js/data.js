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
    image: 'assets/images/hoppou/four-islands-map.jpg',
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
      },
      {
        q: '北方四島の総面積はおよそどれくらい？',
        choices: ['約500 km²', '約2,000 km²', '約5,000 km²', '約10,000 km²'],
        answer: 2,
        explain: '4島合わせて約5,036 km²。鳥取県より少し大きいくらい。'
      },
      {
        q: '戦前、北方領土には何人くらいの日本人が暮らしていた？',
        choices: ['約3,000人', '約17,000人', '約50,000人', '約100,000人'],
        answer: 1,
        explain: '終戦時には約17,000人もの日本人が4島で暮らしていたんだ。'
      },
      {
        q: '北方領土問題で、日本が交渉している相手国は？',
        choices: ['中国', 'ロシア', '韓国', 'アメリカ'],
        answer: 1,
        explain: 'ソ連を引き継いだロシアと、平和条約の締結に向けて交渉が続いているよ。'
      },
      {
        q: '北方領土を管轄する日本の都道府県は？',
        choices: ['青森県', '北海道', '岩手県', '秋田県'],
        answer: 1,
        explain: '北海道根室振興局の管轄。地図上では4島ともしっかり日本領として描かれている。'
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
      },
      {
        q: '江戸時代後期、択捉島を探検し「大日本恵登呂府」の標柱を建てたのは？',
        choices: ['伊能忠敬', '近藤重蔵', '間宮林蔵', '最上徳内'],
        answer: 1,
        explain: '1798年、近藤重蔵が標柱を建てて、ここが日本の領土であることを示した。'
      },
      {
        q: '1956年の日ソ共同宣言に署名した日本の首相は？',
        choices: ['吉田茂', '鳩山一郎', '岸信介', '池田勇人'],
        answer: 1,
        explain: '当時の鳩山一郎首相がモスクワで署名。これで日ソの国交が回復した。'
      },
      {
        q: 'ソ連崩壊後の1993年、日本とロシアが署名した宣言は？',
        choices: ['東京宣言', 'モスクワ宣言', 'クラスノヤルスク合意', 'シベリア宣言'],
        answer: 0,
        explain: '東京宣言では、4島の帰属問題を解決して平和条約を結ぶ方針が確認された。'
      },
      {
        q: '「北方領土の日」が制定されたのは何年？',
        choices: ['1956年', '1981年', '1991年', '2001年'],
        answer: 1,
        explain: '1981年、閣議決定で2月7日を「北方領土の日」と定めたんだ。'
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
      },
      {
        q: '北方領土最高峰の山は、どの島にある？',
        choices: ['択捉島', '国後島', '色丹島', '歯舞群島'],
        answer: 1,
        explain: '国後島の爺爺岳（ちゃちゃだけ）は1,822m。北方領土でいちばん高い。'
      },
      {
        q: '国後島のシンボルとなっている美しい火山の名前は？',
        choices: ['羅臼岳', '爺爺岳', '泊山', '斜古丹山'],
        answer: 1,
        explain: '爺爺岳（ちゃちゃだけ）は富士山に似た円錐形の活火山だよ。'
      },
      {
        q: '北方領土の周辺の海で、戦前にたくさん獲れた水産物は？',
        choices: ['マグロ・カツオ', '鮭・マス・昆布', 'タイ・ヒラメ', 'ウナギ・アユ'],
        answer: 1,
        explain: '鮭・マス・ニシン漁や昆布漁が盛んで、缶詰工場もあったよ。'
      },
      {
        q: '北方領土で見られる、大きな哺乳類の代表は？',
        choices: ['ヒグマ', 'パンダ', 'ライオン', 'チンパンジー'],
        answer: 0,
        explain: '択捉島や国後島にはヒグマが生息していて、サケを捕まえる姿も見られるよ。'
      }
    ]
  },
  {
    id: 'islands',
    title: '四島それぞれクイズ',
    desc: '各島のちょっとマニアックな話',
    icon: '🏝️',
    image: 'assets/images/hoppou/habomai-map.png',
    questions: [
      {
        q: '国後島の面積はおよそどれくらい？',
        choices: ['約250 km²', '約1,500 km²', '約3,000 km²', '約5,000 km²'],
        answer: 1,
        explain: '国後島は約1,489 km²。沖縄本島より大きいんだよ。'
      },
      {
        q: '色丹島の最高峰の山は？',
        choices: ['爺爺岳', '茂世路岳', '斜古丹山', '羅臼岳'],
        answer: 2,
        explain: '斜古丹山（しゃこたんやま）412m。なだらかな丘陵が広がる島だよ。'
      },
      {
        q: '歯舞群島の中で、納沙布岬から最も近い島は？',
        choices: ['貝殻島', '志発島', '勇留島', '水晶島'],
        answer: 0,
        explain: '貝殻島はわずか3.7kmの距離。岬から灯台が肉眼で見えるよ。'
      },
      {
        q: '国後島と北海道（根室半島）の最短距離はおよそ？',
        choices: ['約3 km', '約16 km', '約50 km', '約100 km'],
        answer: 1,
        explain: '根室半島と国後島はわずか16km。晴れた日には島影がはっきり見える。'
      },
      {
        q: '戦前の択捉島で中心地として栄えていた町は？',
        choices: ['内岡（紗那）', '穴澗', '古釜布', '泊'],
        answer: 0,
        explain: '内岡（うちおか）の紗那（しゃな）地区が行政・経済の中心だったよ。'
      },
      {
        q: '歯舞群島は何でできた島々の集まり？',
        choices: ['ひとつの大きな島', '6つの島と岩礁', '20以上の島々', '無人島だけ'],
        answer: 1,
        explain: '貝殻島・水晶島・秋勇留島・勇留島・志発島・多楽島など、6島群と岩礁から成るよ。'
      }
    ]
  },
  {
    id: 'expert',
    title: '難問チャレンジ',
    desc: '🎓 北方領土マスターを目指せ',
    icon: '🎓',
    image: 'assets/images/hoppou/iturup-coast.jpg',
    questions: [
      {
        q: '1855年の日魯通好条約は、現在の何という場所で調印された？',
        choices: ['江戸（東京）', '下田', '函館', 'モスクワ'],
        answer: 1,
        explain: '伊豆半島の下田、玉泉寺で調印。プチャーチン提督と川路聖謨らが交渉した。'
      },
      {
        q: '近藤重蔵が1798年に択捉島に建てた標柱に書かれていた言葉は？',
        choices: ['大日本恵登呂府', '日本国之地', '皇国之島', '蝦夷地以北'],
        answer: 0,
        explain: '「大日本恵登呂府（だいにっぽんえとろふ）」と書かれ、日本領であることを示した。'
      },
      {
        q: '1875年の樺太・千島交換条約で日本領となった、千島列島最北端の島は？',
        choices: ['ウルップ島', 'パラムシル島', 'シュムシュ島（占守島）', 'ラショワ島'],
        answer: 2,
        explain: 'シュムシュ島はカムチャッカ半島のすぐ南。樺太を手放す代わりに千島列島全体を得た。'
      },
      {
        q: '1945年2月のヤルタ会談で千島列島の引き渡しを密約したのは？',
        choices: ['米ソの2カ国', '米英ソの3カ国', '米英中ソの4カ国', '英ソの2カ国'],
        answer: 1,
        explain: 'ルーズベルト・チャーチル・スターリンによる米英ソの密約。後に大きな問題となった。'
      },
      {
        q: '択捉島と国後島の間を流れる海峡の名前は？',
        choices: ['根室海峡', '国後水道', '択捉水道', '宗谷海峡'],
        answer: 1,
        explain: '国後水道（くなしりすいどう）と呼ばれる海峡だよ。'
      },
      {
        q: '江戸時代に「赤蝦夷風説考」を著し、ロシアの脅威を警告した人物は？',
        choices: ['林子平', '工藤平助', '本多利明', '大黒屋光太夫'],
        answer: 1,
        explain: '仙台藩医・工藤平助が1781年に田沼意次に提出。日本初のロシア研究書とも言われる。'
      },
      {
        q: '1812年、ロシアに捕らえられたゴロウニン艦長の解放交渉に尽力した日本の商人は？',
        choices: ['大黒屋光太夫', '高田屋嘉兵衛', '津太夫', '中川五郎治'],
        answer: 1,
        explain: '淡路出身の高田屋嘉兵衛は、自身もロシアに連行された後、両国の橋渡し役となった。'
      },
      {
        q: '北方領土を「南クリル」と呼ぶロシアの管轄行政区分は？',
        choices: ['カムチャッカ地方', 'マガダン州', 'サハリン州', '沿海地方'],
        answer: 2,
        explain: 'ロシアでは南クリル管区としてサハリン州の管轄下に置かれている。'
      },
      {
        q: '北方領土最高峰・爺爺岳（ちゃちゃだけ）の正確な標高は？',
        choices: ['1,498m', '1,772m', '1,822m', '1,917m'],
        answer: 2,
        explain: '国後島の爺爺岳は1,822m。富士山に似た円錐形の活火山だよ。'
      },
      {
        q: '根室市にある北方領土に関する学習・展示施設「ニ・ホ・ロ」とは？',
        choices: ['北方四島交流センター', '北方領土歴史博物館', '北方資料館', 'オホーツク文化館'],
        answer: 0,
        explain: '正式名「北方四島交流センター」。1986年に根室市にオープンした学習・交流拠点。'
      }
    ]
  },
  {
    id: 'lifestyle',
    title: '島の暮らしクイズ',
    desc: '元島民の暮らしと現代の関わり',
    icon: '🏘️',
    image: 'assets/images/hoppou/easternmost-point.jpg',
    questions: [
      {
        q: '戦前、北方領土には町や村がいくつあった？',
        choices: ['7つ', '15', '24', '40以上'],
        answer: 2,
        explain: '4島合わせて24の町や村があり、学校や病院、役場もそろっていたんだ。'
      },
      {
        q: '戦前の北方領土で日本人が多く従事していた仕事は？',
        choices: ['工場労働', '漁業・水産加工', '農業', '林業'],
        answer: 1,
        explain: '鮭・マス・昆布の漁業と、それを加工する缶詰工場が島の経済を支えた。'
      },
      {
        q: '元島民が島を訪れる「ビザなし渡航」が始まったのは何年？',
        choices: ['1956年', '1965年', '1992年', '2005年'],
        answer: 2,
        explain: '1992年から始まった人道的な交流。元島民がパスポートなしで島を訪問できた。'
      },
      {
        q: '戦後、元島民が初めて先祖の墓参りに島を訪れたのは何年？',
        choices: ['1956年', '1964年', '1972年', '1985年'],
        answer: 1,
        explain: '1964年、ようやく墓参りが認められて、元島民の悲願がひとつ叶った。'
      },
      {
        q: '元島民やその子孫が今いちばん多く暮らす街は？',
        choices: ['札幌市', '函館市', '根室市', '釧路市'],
        answer: 2,
        explain: '根室市は北方領土を望む最前線の街。返還運動の中心地でもあるよ。'
      },
      {
        q: '北方領土返還運動でよく使われる合言葉は？',
        choices: ['返せ！北方領土', '取り戻せ！日本の島', '帰ろう！故郷へ', '守ろう！四島'],
        answer: 0,
        explain: '「返せ！北方領土」は返還運動を象徴する合言葉として広く知られているよ。'
      }
    ]
  }
];

/* ============================================================
   Nemuro Furusato Nozei (ふるさと納税) catalog
   Educational reference — actual donations happen on official portals.
   ============================================================ */
window.NEMURO_FURUSATO = [
  {
    id: 'hanasaki-crab',
    name: '花咲ガニ姿茹で 1.0kg',
    desc: '根室を代表する高級ガニ。濃厚な味わいが絶品',
    emoji: '🦀',
    category: 'カニ',
    amount: 22000,
    accent: 'coral'
  },
  {
    id: 'salmon-roe',
    name: 'いくら醤油漬け 500g',
    desc: '北海道産の鮭から取れた、宝石のようないくら',
    emoji: '🍣',
    category: '海鮮',
    amount: 17000,
    accent: 'cherry'
  },
  {
    id: 'scallops',
    name: '北海道産 ホタテ貝柱 1kg',
    desc: '甘みたっぷりの大粒ホタテ。お刺身にも',
    emoji: '🐚',
    category: '海鮮',
    amount: 14000,
    accent: 'ocean'
  },
  {
    id: 'sea-urchin',
    name: 'バフンウニ 折詰 100g',
    desc: '濃厚クリーミーな根室産ウニ。獲れたて直送',
    emoji: '🟡',
    category: '海鮮',
    amount: 18000,
    accent: 'gold'
  },
  {
    id: 'oysters',
    name: '殻付き生牡蠣 5kg（約40〜50個）',
    desc: '冷たい海で育った濃厚な味の生牡蠣',
    emoji: '🦪',
    category: '海鮮',
    amount: 16000,
    accent: 'plum'
  },
  {
    id: 'salmon-whole',
    name: '北海道産 鮭まるごと一本（約2.5kg）',
    desc: '塩漬けの鮭一本を丸ごとお届け。切り分けて長期保存も可',
    emoji: '🐟',
    category: '魚',
    amount: 23000,
    accent: 'coral'
  },
  {
    id: 'kelp',
    name: '根室産 棹前昆布 2kg',
    desc: '上品な味わいの根室産昆布。出汁・煮物に',
    emoji: '🌿',
    category: '乾物',
    amount: 9000,
    accent: 'mint'
  },
  {
    id: 'crab-set',
    name: '花咲ガニ＋毛ガニ 食べ比べセット',
    desc: '根室名物の二大ガニを贅沢に食べ比べ',
    emoji: '🦀',
    category: 'カニ',
    amount: 35000,
    accent: 'coral'
  },
  {
    id: 'salmon-roe-trout',
    name: '醤油いくら＆鮭ハラス 詰合せ',
    desc: 'ご飯のお供にぴったり。家族で楽しめるセット',
    emoji: '🍱',
    category: '海鮮',
    amount: 13000,
    accent: 'gold'
  },
  {
    id: 'history-book',
    name: '北方領土学習図書セット',
    desc: '元島民の証言や写真をまとめた学習資料',
    emoji: '📚',
    category: '文化',
    amount: 8000,
    accent: 'ocean'
  }
];

window.FURUSATO_PORTAL_URL = 'https://www.city.nemuro.hokkaido.jp/dispatcher.do?url=hr0307';

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
