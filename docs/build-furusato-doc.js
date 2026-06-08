// Build 北方領土ゲームアプリ 別紙③ ふるさと納税連携機能 動作仕様書
// Run: node build-furusato-doc.js
const path = require('path');
const fs = require('fs');

const docxPath = '/opt/homebrew/lib/node_modules/docx';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ImageRun,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak
} = require(docxPath);

const SS = path.join(__dirname, 'screenshots');
const JP_HEAD = 'Yu Gothic';
const JP_BODY = 'Yu Mincho';

const para = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 80, line: 320 },
    ...opts,
    children: opts.children || [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });
const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 30, bold: true, color: '1F3D6E' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F3D6E', space: 6 } }
  });
const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 25, bold: true, color: '2A2A2A' })]
  });
const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 22, bold: true, color: '4A4A4A' })]
  });
const bullet = (text, lvl = 0) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: lvl },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });
const numbered = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });
const caption = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, italics: true, color: '666666' })]
  });
const noteCallout = (text) =>
  new Paragraph({
    spacing: { before: 100, after: 100, line: 300 },
    indent: { left: 280 },
    shading: { fill: 'FFF6E5', type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9692A', space: 8 } },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 21 })]
  });

function imageParagraph(filename, opts = {}) {
  const data = fs.readFileSync(path.join(SS, filename));
  const isMobile = filename.includes('mobile');
  const width = isMobile ? (opts.width || 260) : (opts.width || 520);
  const height = isMobile ? Math.round(width * 844 / 390) : Math.round(width * 800 / 1280);
  return new Paragraph({
    spacing: { before: 80, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({
      type: 'png', data,
      transformation: { width, height },
      altText: { title: opts.title || filename, description: opts.title || filename, name: filename }
    })]
  });
}

// Table helpers
const border = { style: BorderStyle.SINGLE, size: 6, color: '999999' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, opts = {}) {
  return new TableCell({
    borders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text, font: { ascii: 'Arial', eastAsia: opts.bold ? JP_HEAD : JP_BODY },
        size: opts.size || 21, bold: !!opts.bold,
        color: opts.color || (opts.bold ? '1F3D6E' : '2A2A2A')
      })]
    })]
  });
}

const TOTAL_WIDTH = 9360;

// ===================== Sections =====================

const titleBlock = [
  new Paragraph({
    spacing: { before: 400, after: 80 }, alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: '2026年5月27日', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, color: '666666' })]
  }),
  new Paragraph({
    spacing: { after: 0 }, alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: '別紙 ③', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, color: '666666' })]
  }),
  new Paragraph({
    spacing: { before: 800, after: 60 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '北方領土ゲームアプリ', font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 36, bold: true, color: '1F3D6E' })]
  }),
  new Paragraph({
    spacing: { before: 0, after: 600 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'ふるさと納税連携機能 動作仕様書', font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 28, bold: true, color: '1F3D6E' })]
  }),
  new Paragraph({
    spacing: { before: 200, after: 100 }, alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: 'C9A56A', space: 8 } },
    children: [new TextRun({ text: '', font: { ascii: 'Arial' }, size: 20 })]
  }),
  new Paragraph({
    spacing: { after: 40 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '対象機能：ショップ画面 「ふるさと納税」タブ', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  }),
  new Paragraph({
    spacing: { after: 40 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '関連自治体：北海道 根室市', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  }),
  new Paragraph({
    spacing: { after: 400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'URL： https://playmark0227-svg.github.io/hoppo/', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22, color: '1F3D6E' })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

const sec1 = [
  h1('1. 本機能の位置づけ'),
  para('本機能は、ユーザー（学習者）が北方領土を含む根室地域への関心を高める導線として、根室市の代表的なふるさと納税返礼品を「参考情報」として表示するものです。'),
  para('本アプリ内では、寄附の受付・決済・あっせん・媒介・コンサルティング等は一切行いません。あくまで公式ポータルサイトへの誘導と、学習・啓発を目的とした情報提示にとどめます。'),

  noteCallout('【重要】本アプリは「特定寄附金の募集に関する業務」「寄附の媒介・あっせん」「ポータルサイト的機能」のいずれにも該当しません。これは事業実施における前提条件です。'),
];

const sec2 = [
  h1('2. 画面構成'),
  para('ショップ画面（メニュー：ショップ）の最上部に2つのタブを設置し、ユーザーが切り替え可能としています。'),

  h3('2.1 タブ構成'),
  (function () {
    const w1 = 2200, w2 = 2400, w3 = TOTAL_WIDTH - w1 - w2;
    const head = new TableRow({ tableHeader: true, children: [
      cell('タブ', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('機能区分', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('内容', { width: w3, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
    ] });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2, w3],
      rows: [
        head,
        new TableRow({ children: [
          cell('ポイント交換', { width: w1, bold: true, align: AlignmentType.CENTER }),
          cell('アプリ内機能', { width: w2 }),
          cell('既存のポイント引き換え。ユーザーがアプリ内で貯めたポイントと実物グッズ等を交換。', { width: w3 })
        ] }),
        new TableRow({ children: [
          cell('ふるさと納税', { width: w1, bold: true, align: AlignmentType.CENTER, color: 'C9692A' }),
          cell('学習・誘導機能', { width: w2 }),
          cell('根室市の代表的な返礼品を一覧表示。詳細ボタンで根室市公式ふるさと納税ページ（外部）に遷移。', { width: w3 })
        ] })
      ]
    });
  })(),

  h3('2.2 スクリーンショット（スマホ版）'),
  imageParagraph('06-mobile-shop-furusato.png', { title: 'ふるさと納税タブ（スマホ）' }),
  caption('図 2-1：ショップ画面 「ふるさと納税」タブ（スマートフォン）'),

  h3('2.3 スクリーンショット（PC版）'),
  imageParagraph('15-desktop-shop-furusato.png', { title: 'ふるさと納税タブ（PC）' }),
  caption('図 2-2：ショップ画面 「ふるさと納税」タブ（PC）')
];

const sec3 = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('3. 表示する返礼品データ'),
  para('現状は学習目的の参考データとして、根室市を代表する返礼品10種を掲載しています。寄附金額は公開情報から推定した「目安」であり、最新・正式な金額は必ず公式ふるさと納税ポータル上でご確認いただく仕組みとしています。'),

  h3('3.1 掲載項目'),
  (function () {
    const w1 = 600, w2 = 3600, w3 = 1600, w4 = TOTAL_WIDTH - w1 - w2 - w3;
    const head = new TableRow({ tableHeader: true, children: [
      cell('項目', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('表示内容', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('カテゴリ', { width: w3, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('寄附金額目安', { width: w4, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
    ] });
    const items = [
      [1, '花咲ガニ姿茹で 1.0kg', 'カニ', '¥22,000〜'],
      [2, 'いくら醤油漬け 500g', '海鮮', '¥17,000〜'],
      [3, '北海道産 ホタテ貝柱 1kg', '海鮮', '¥14,000〜'],
      [4, 'バフンウニ 折詰 100g', '海鮮', '¥18,000〜'],
      [5, '殻付き生牡蠣 5kg（約40〜50個）', '海鮮', '¥16,000〜'],
      [6, '北海道産 鮭まるごと一本（約2.5kg）', '魚', '¥23,000〜'],
      [7, '根室産 棹前昆布 2kg', '乾物', '¥9,000〜'],
      [8, '花咲ガニ＋毛ガニ 食べ比べセット', 'カニ', '¥35,000〜'],
      [9, '醤油いくら＆鮭ハラス 詰合せ', '海鮮', '¥13,000〜'],
      [10, '北方領土学習図書セット', '文化', '¥8,000〜'],
    ];
    const rows = items.map(([n, name, cat, amt]) => new TableRow({ children: [
      cell(String(n), { width: w1, align: AlignmentType.CENTER }),
      cell(name, { width: w2 }),
      cell(cat, { width: w3, align: AlignmentType.CENTER }),
      cell(amt, { width: w4, align: AlignmentType.RIGHT })
    ] }));
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2, w3, w4],
      rows: [head, ...rows]
    });
  })(),

  new Paragraph({ spacing: { after: 80 }, children: [] }),

  h3('3.2 各カードに表示する情報'),
  bullet('返礼品名（製品名）'),
  bullet('カテゴリ（カニ／海鮮／魚／乾物／文化 など）'),
  bullet('商品概要テキスト（1〜2文）'),
  bullet('寄附金額の目安（「〜」付きで上方変動の余地を明示）'),
  bullet('「詳細」ボタン（公式ポータルへの遷移トリガー）'),

  h3('3.3 表示しない情報'),
  bullet('在庫数・配送状況・キャンペーン期間'),
  bullet('注文ボタン・購入ボタン・決済情報'),
  bullet('返礼品の生産者名・販売事業者名（公式ページにて確認していただく前提）'),
  bullet('利用者の氏名・住所・連絡先 等の個人情報'),
];

const sec4 = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('4. 操作フローと挙動'),

  h3('4.1 タブ切り替え'),
  numbered('ユーザーがショップメニューを開く（ボトムナビ ／ サイドバー ／ ホーム画面のクイックタイル）。'),
  numbered('画面上部にポイント残高カード、その下に「ポイント交換」「ふるさと納税」の2タブを表示。'),
  numbered('「ふるさと納税」タブを選択 → 紹介ブロック＋返礼品10カード＋公式ページ誘導CTA を表示。'),

  h3('4.2 「詳細」ボタン押下時'),
  numbered('カード内「詳細」ボタンを押下するとブラウザ標準のconfirm()ダイアログを表示。'),
  numbered('ダイアログ本文：「公式のふるさと納税ポータルで詳細を確認しますか？」'),
  numbered('「OK」を選択した場合のみ、根室市公式ふるさと納税ページ（furusato-tax.jp）を別タブで開く。'),
  numbered('「キャンセル」を選択した場合は何もしない（アプリ内に留まる）。'),

  h3('4.3 下部CTA（公式ページへ）'),
  para('カード一覧の下部に常設のCTA（青色のフルワイドボタン）を配置。一覧をスクロールしないユーザー向けの導線として、根室市の公式ふるさと納税ページに別タブで遷移します。'),

  h3('4.4 免責表記'),
  para('画面下部に固定文を表示します：'),
  noteCallout('※ 表示の返礼品・金額は参考例です。実際の寄附は公式ポータル（ふるさとチョイス・さとふる等）からお願いします。'),
];

const sec5 = [
  h1('5. 外部リンク仕様'),

  h3('5.1 遷移先URL'),
  (function () {
    const w1 = 2400, w2 = TOTAL_WIDTH - w1;
    const head = new TableRow({ tableHeader: true, children: [
      cell('遷移トリガー', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('遷移先URL', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
    ] });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2],
      rows: [
        head,
        new TableRow({ children: [
          cell('各カードの「詳細」ボタン', { width: w1, bold: true }),
          cell('https://www.furusato-tax.jp/city/info/01223', { width: w2 })
        ] }),
        new TableRow({ children: [
          cell('下部CTA「公式ふるさと納税ページへ」', { width: w1, bold: true }),
          cell('https://www.furusato-tax.jp/city/info/01223', { width: w2 })
        ] })
      ]
    });
  })(),

  new Paragraph({ spacing: { after: 80 }, children: [] }),

  h3('5.2 外部遷移の方式'),
  bullet('target="_blank" + rel="noopener noreferrer" を付与し、別タブで開きつつ window.opener の参照を渡しません。'),
  bullet('遷移前にユーザー確認（confirm ダイアログ）を挟みます。誤クリック・無自覚な遷移を防ぐ目的です。'),
  bullet('リンク先のURLは設定上の定数として一元管理しており、ふるさと納税ポータルの仕様変更に追従できる構造です。'),
];

const sec6 = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('6. アプリが「行わないこと」（明示）'),
  para('本アプリのふるさと納税タブは、以下の機能・処理を一切実装しません。これは設計上の前提であり、今後も実装する予定はありません。'),

  bullet('寄附の受付（カート機能・寄附フォーム・申込ボタン）'),
  bullet('決済処理（クレジットカード入力・銀行口座入力・電子マネー連携）'),
  bullet('利用者の個人情報の取得（氏名・住所・電話番号・メールアドレス・生年月日・性別）'),
  bullet('返礼品の在庫管理・配送追跡'),
  bullet('寄附者と自治体／事業者の間の媒介・あっせん・斡旋'),
  bullet('ふるさと納税ポータル各社のアフィリエイトプログラムによる手数料収受'),
  bullet('利用者の寄附履歴・行動履歴の外部送信／第三者提供'),
];

const sec7 = [
  h1('7. プライバシー・データの取り扱い'),
  bullet('ふるさと納税タブの閲覧・操作に関するデータは外部に送信しません。'),
  bullet('「詳細を見る」操作のログも端末内・サーバー側のいずれにも保存しません。'),
  bullet('Cookie・LocalStorage に書き込むのはアプリ既存の設定値（言語・モーション設定等）のみで、寄附関連の識別情報は含みません。'),
  bullet('利用者を特定する識別子（広告ID・指紋・eメール・電話番号）の取得・保管・送信は行いません。'),
];

const sec8 = [
  h1('8. 表記・運用ルール'),

  h3('8.1 言葉づかい'),
  bullet('「寄附（きふ）」ではなく一般読者向けに「ふるさと納税」「寄附金」「返礼品」等の標準語彙を使用します。'),
  bullet('価格表記は「寄附 ¥xx,xxx〜」のように、上方変動余地を含む「〜」付き表記で統一します。'),
  bullet('断定的な購買誘導表現（「お得」「今すぐ」「人気No.1」等）は使用しません。'),

  h3('8.2 掲載・更新ルール'),
  bullet('掲載する返礼品の選定は、根室市公式ふるさと納税ページにて公表されている代表的な品目から行います。'),
  bullet('掲載内容に誤りがあった場合や、根室市・北対協様等からのご指摘があった場合は、速やかに修正・削除いたします。'),
  bullet('返礼品ラインナップは半年〜1年ごとに見直しを行い、最新情報に近づける運用とします。'),
];

const sec9 = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('9. 想定問答（QA）'),
  h3('Q1. アプリ内で実際に寄附できるのですか？'),
  para('いいえ。本アプリは寄附の受付・決済を一切行いません。実際の寄附は公式ふるさと納税ポータル（ふるさとチョイス・さとふる・ふるなび・楽天ふるさと納税 等）からお願いいたします。'),
  h3('Q2. 表示金額と公式ポータルの金額が異なります。'),
  para('本アプリの「寄附金額の目安」は公開情報から推定した参考値です。最新・正確な金額・在庫・キャンペーン情報は、公式ポータル上で必ずご確認ください。'),
  h3('Q3. アプリの運営者は寄附から手数料を受け取っていますか？'),
  para('いいえ。本アプリはふるさと納税ポータルとのアフィリエイト契約を結んでおらず、寄附の発生に伴う手数料・成果報酬の受領は一切ありません。'),
  h3('Q4. 私の寄附履歴がアプリに記録されますか？'),
  para('いいえ。寄附に関する情報（金額・返礼品・申込日時・住所・氏名等）は、本アプリ側で取得・記録・保管いたしません。'),
  h3('Q5. 掲載されている返礼品の追加・削除を希望できますか？'),
  para('はい。北対協様もしくは根室市様からのご指示・ご要望を受けて、速やかに変更いたします。'),
];

const sec10 = [
  h1('10. 改訂履歴'),
  (function () {
    const w1 = 1600, w2 = 1800, w3 = TOTAL_WIDTH - w1 - w2;
    const head = new TableRow({ tableHeader: true, children: [
      cell('版', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('日付', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
      cell('内容', { width: w3, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
    ] });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2, w3],
      rows: [head, new TableRow({ children: [
        cell('第 1 版', { width: w1, align: AlignmentType.CENTER, bold: true }),
        cell('2026年5月27日', { width: w2, align: AlignmentType.CENTER }),
        cell('初版作成', { width: w3 })
      ] })]
    });
  })(),

  new Paragraph({ spacing: { before: 600 }, children: [] }),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 8 } },
    children: [new TextRun({ text: '', font: { ascii: 'Arial' }, size: 18 })]
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: '以  上', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22, bold: true })]
  }),
];

// --- Compose ---
const doc = new Document({
  creator: 'HoppouStatus Project',
  title: 'ふるさと納税連携機能 動作仕様書',
  description: '北対協様 ご検討用 別紙③',
  styles: {
    default: { document: { run: { font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '1F3D6E' },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '2A2A2A' },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '4A4A4A' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } }
      ] },
      { reference: 'numbers', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }
      ] }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: '別紙③ ふるさと納税連携機能 動作仕様書',
            font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 18, color: '999999'
          })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '- ', font: { ascii: 'Arial' }, size: 18, color: '999999' }),
            new TextRun({ children: [PageNumber.CURRENT], font: { ascii: 'Arial' }, size: 18, color: '999999' }),
            new TextRun({ text: ' -', font: { ascii: 'Arial' }, size: 18, color: '999999' })
          ]
        })]
      })
    },
    children: [
      ...titleBlock,
      ...sec1, ...sec2, ...sec3, ...sec4, ...sec5,
      ...sec6, ...sec7, ...sec8, ...sec9, ...sec10
    ]
  }]
});

const outPath = path.join(__dirname, '北方領土ゲームアプリ_別紙③_ふるさと納税連携機能_動作仕様書_v1.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Created:', outPath, '(' + Math.round(buf.length / 1024) + ' KB)');
});
