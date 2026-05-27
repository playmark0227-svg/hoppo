// Build 北方領土ゲームアプリ 企画書 v1
// Run: node build-spec-doc.js

const path = require('path');
const fs = require('fs');

// Load docx from global install
const docxPath = '/opt/homebrew/lib/node_modules/docx';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, TabStopType, TabStopPosition
} = require(docxPath);

const JP_HEAD = 'Yu Gothic';   // 見出しは游ゴシック (Mac/Win共通)
const JP_BODY = 'Yu Mincho';   // 本文は游明朝で公式書類風
const JP_SANS = 'Yu Gothic';   // 一覧表など

// --- helpers ---
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
    children: [
      new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 30, bold: true, color: '1F3D6E' })
    ],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F3D6E', space: 6 } }
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 25, bold: true, color: '2A2A2A' })
    ]
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 22, bold: true, color: '4A4A4A' })
    ]
  });

const bullet = (text, opts = {}) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: opts.level || 0 },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });

const subBullet = (text) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 1 },
    spacing: { after: 40, line: 280 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 21 })]
  });

const noteCallout = (text) =>
  new Paragraph({
    spacing: { before: 100, after: 100, line: 300 },
    indent: { left: 280 },
    shading: { fill: 'F4F1E8', type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'C9A56A', space: 8 } },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 21, italics: false })]
  });

const small = (text) =>
  new Paragraph({
    spacing: { after: 60, line: 280 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, color: '666666' })]
  });

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
        text,
        font: { ascii: 'Arial', eastAsia: opts.bold ? JP_HEAD : JP_BODY },
        size: opts.size || 21,
        bold: !!opts.bold,
        color: opts.color || (opts.bold ? '1F3D6E' : '2A2A2A')
      })]
    })]
  });
}

// --- Document body ---

const TOTAL_WIDTH = 9360; // US Letter content width

// Cover-like title block
const titleBlock = [
  new Paragraph({
    spacing: { before: 400, after: 80 },
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({
      text: '2026年5月22日',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 20,
      color: '666666'
    })]
  }),
  new Paragraph({
    spacing: { after: 0 },
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({
      text: '第 1 版',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 20,
      color: '666666'
    })]
  }),
  new Paragraph({
    spacing: { before: 800, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: '北方領土ゲームアプリ',
      font: { ascii: 'Arial', eastAsia: JP_HEAD },
      size: 44,
      bold: true,
      color: '1F3D6E'
    })]
  }),
  new Paragraph({
    spacing: { before: 0, after: 600 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: '企 画 書',
      font: { ascii: 'Arial', eastAsia: JP_HEAD },
      size: 40,
      bold: true,
      color: '1F3D6E',
      characterSpacing: 200
    })]
  }),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: 'C9A56A', space: 8 } },
    children: [new TextRun({ text: '', font: { ascii: 'Arial' }, size: 20 })]
  }),
  new Paragraph({
    spacing: { after: 40 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'アプリ名： 北方領土ステータス',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 24,
      bold: true
    })]
  }),
  new Paragraph({
    spacing: { after: 40 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'URL： https://playmark0227-svg.github.io/hoppo/',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 22,
      color: '1F3D6E'
    })]
  }),
  new Paragraph({
    spacing: { after: 400 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: '対応端末： PC / スマートフォン （PWA）',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 22
    })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

// 1. アプリ概要
const overview = [
  h1('1. アプリ概要'),
  (function () {
    const w1 = 2200, w2 = TOTAL_WIDTH - w1;
    const row = (k, v) => new TableRow({
      children: [
        cell(k, { width: w1, fill: 'F2F4F8', bold: true }),
        cell(v, { width: w2 })
      ]
    });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2],
      rows: [
        row('名 称', '北方領土ステータス'),
        row('目 的', '北方領土に関する正しい知識を、ゲーミフィケーションを通じて楽しく学んでもらう啓発アプリ'),
        row('対 応', 'PWA（PC・スマートフォン両対応）'),
        row('U R L', 'https://playmark0227-svg.github.io/hoppo/'),
        row('マスコット', 'エリカちゃん（エトピリカ）'),
        row('提供形態', '無料（基本料金なし、ログイン不要）')
      ]
    });
  })(),
  new Paragraph({ spacing: { after: 80 }, children: [] })
];

// 2. クイズの設問と答え
const quizSection = [
  h1('2. クイズの設問と答え（全47問）'),
  para('現在、以下の6カテゴリ・計47問を実装しております。全設問・選択肢・正解・解説の一覧は、別紙（Excel）にてご提供いたします。'),

  // Quiz categories table
  (function () {
    const w1 = 800, w2 = 4400, w3 = TOTAL_WIDTH - w1 - w2;
    const header = new TableRow({
      tableHeader: true,
      children: [
        cell('No.', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER }),
        cell('カテゴリ', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true }),
        cell('設問数', { width: w3, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
      ]
    });
    const row = (n, cat, q) => new TableRow({
      children: [
        cell(n, { width: w1, align: AlignmentType.CENTER }),
        cell(cat, { width: w2 }),
        cell(q, { width: w3, align: AlignmentType.CENTER })
      ]
    });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2, w3],
      rows: [
        header,
        row('①', '北方領土 基本クイズ',   '9 問'),
        row('②', '歴史のクイズ',         '8 問'),
        row('③', '自然・文化クイズ',     '8 問'),
        row('④', '四島それぞれクイズ',   '6 問'),
        row('⑤', '難問チャレンジ',       '10 問'),
        row('⑥', '島の暮らしクイズ',     '6 問'),
        new TableRow({
          children: [
            cell('合計', { width: w1 + w2, fill: 'F2F4F8', bold: true, align: AlignmentType.RIGHT }),
            cell('47 問', { width: w3, fill: 'F2F4F8', bold: true, align: AlignmentType.CENTER })
          ]
        })
      ]
    });
  })(),

  new Paragraph({ spacing: { after: 80 }, children: [] }),

  h3('設問内容について'),
  bullet('全設問は、日本政府および北方領土問題対策協会の公式見解に沿った内容で構成しております。'),
  bullet('内閣府・北対協・外務省等が公開している公式資料、ならびに学術文献・自治体公表資料を参照のうえ作成しております。'),
  bullet('解説欄には、根拠となる条約名・年号・地理データ等の典拠を併記しております。'),
  bullet('掲載内容については定期的に見直し・更新を行う予定です。新たな啓発資料や情勢変化、学術的な知見の更新などを反映するほか、ご指摘・ご要望をいただいた場合は適宜修正・差し替えを実施いたします。'),
  bullet('各カテゴリ全問正解で +50pt のボーナスを付与します。'),

  noteCallout('※ 全設問・選択肢・正解・解説の詳細一覧は、別紙（Excel）をご参照ください。'),
];

// 3. ゲームのながれ
const flowSection = [
  h1('3. ゲームのながれ'),
  para('ユーザーの基本的な導線は以下のとおりです。'),

  numbered('アプリを起動 → ホーム画面で現在のステータス（ランク・累計ポイント・連続ログイン日数等）を確認'),
  numbered('メニューから「クイズ／QR読み取り／ショップ／ライセンス」を選択'),
  numbered('以下のアクションでポイントを獲得'),
  subBullet('クイズ正解（全問正解時は +50pt ボーナス）'),
  subBullet('イベント会場のQRコード読み取り'),
  subBullet('毎日のログインボーナス（最大 15pt／日）'),
  numbered('獲得ポイントでショップアイテムと交換'),
  numbered('累計ポイントに応じてランクが5段階で自動昇格'),
  subBullet('島民見習い → 北方ナビゲーター → 花咲ガニ大使 → 流氷の守り手 → 北方領土総理'),
  numbered('プロフィール画面でニックネーム・自己紹介・アバター・推しの島等をカスタマイズ可能'),

  h3('データ管理について'),
  bullet('ユーザーデータは端末内（ブラウザ localStorage）のみで保管しております。'),
  bullet('外部送信は一切行っておりません。'),
  bullet('個人情報の取得・サーバー保管はございません。'),
];

// 4. ふるさと納税
const furusatoSection = [
  h1('4. ふるさと納税との連携ルール'),
  para('本アプリ内では、寄附の受付・決済・あっせん等は一切行っておりません。学習・啓発を目的とした「参考情報の表示」と、「根室市公式ページへの外部リンク誘導」のみを設けております。'),

  h3('具体的な仕様'),
  bullet('根室市の代表的な返礼品（花咲ガニ・いくら・ホタテ・棹前昆布・北方領土学習図書セット 他、計10種）をカード形式で一覧表示しております。'),
  bullet('各カードには「返礼品名／カテゴリ／寄附金額目安／商品概要」のみを掲載しております。'),
  bullet('「詳細」ボタン押下時には、確認ダイアログを経た上で、根室市公式ふるさと納税ページ（furusato-tax.jp）へ別タブで遷移いたします。'),
  bullet('画面下部に「※ 実際の寄附は公式ポータルからお願いします」との免責表記を常時表示しております。'),
  bullet('個人情報・支払情報の取得は一切行わない設計としております。'),
  bullet('アフィリエイト等の手数料収受は一切ございません。'),
];

// 5. マネタイズ
const monetizeSection = [
  h1('5. マネタイズ（収益化）'),
  para('本アプリ自体はユーザーへの基本無料での提供を予定しております。収益化につきましては、以下のモデルを想定しております。'),

  h2('5.1 主な収益源'),

  h3('① イベント主催者様からのQRコード発行料（メイン）'),
  bullet('イベント会場で配布・設置していただくQRコード（および紐づくデータ）の発行・登録料を、イベント主催者様よりお預かりする形を予定しております。'),
  bullet('北方領土関連のイベント・展示・講演会、自治体・教育機関・観光施設・物産展などでの活用を想定しております。'),
  bullet('主催者様にはイベントごと（または期間ごと）に専用QRコードを発行いたします。'),
  bullet('具体的な金額・課金体系（イベント単位／月額／コード枚数別 等）は現在検討中でございます。今後、利用想定団体様のニーズや市場相場をふまえつつ、北対協様ともご相談のうえ決定してまいりたく存じます。'),

  h3('② ポイント交換時の送料（ユーザー実費負担）'),
  bullet('ショップ機能でユーザーがポイントを実物グッズと交換した際、配送先までの送料はユーザー負担としてご請求する予定です。'),
  bullet('グッズ本体（ステッカー・バッジ・ぬいぐるみ等）はポイントとの交換で提供いたします。'),
  bullet('送料のみ実費でユーザーから別途お預かりする形（地域別の宅配便実費を想定）でございます。'),
  bullet('デジタル特典・壁紙等、配送を伴わないアイテムは送料不要となります。'),

  h2('5.2 ユーザーへの課金方針'),

  (function () {
    const w1 = 5200, w2 = TOTAL_WIDTH - w1;
    const header = new TableRow({
      tableHeader: true,
      children: [
        cell('項目', { width: w1, fill: '1F3D6E', color: 'FFFFFF', bold: true }),
        cell('課金', { width: w2, fill: '1F3D6E', color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })
      ]
    });
    const row = (k, v, vColor) => new TableRow({
      children: [
        cell(k, { width: w1 }),
        cell(v, { width: w2, align: AlignmentType.CENTER, bold: true, color: vColor || '2A2A2A' })
      ]
    });
    return new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2],
      rows: [
        header,
        row('アプリ利用料',                         '無 料',          '1F7D3E'),
        row('クイズ・コンテンツの閲覧',             '無 料',          '1F7D3E'),
        row('ポイント獲得・ランクアップ',           '無 料',          '1F7D3E'),
        row('広告表示',                             'な し',          '1F7D3E'),
        row('実物グッズの配送送料',                 'ユーザー実費負担', 'C95E2A'),
        row('ふるさと納税の手数料・アフィリエイト', '一切なし',        '1F7D3E'),
      ]
    });
  })(),

  new Paragraph({ spacing: { after: 80 }, children: [] }),
  small('※ ふるさと納税の手数料・アフィリエイトはございません（根室市公式ページへの無償導線のみ）。'),
];

// 6. 添付・参考資料
const attachmentSection = [
  h1('6. 添付・参考資料'),
  bullet('別紙 ： クイズ全47問 設問・選択肢・正解・解説 一覧表'),
  bullet('別紙 ： 画面遷移図および主要機能スクリーンショット'),
  bullet('別紙 ： ふるさと納税連携機能の動作仕様書'),
  bullet('動作確認URL ： https://playmark0227-svg.github.io/hoppo/'),

  new Paragraph({ spacing: { before: 600 }, children: [] }),
  new Paragraph({
    spacing: { before: 200, after: 100 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 8 } },
    children: [new TextRun({ text: '', font: { ascii: 'Arial' }, size: 18 })]
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 40 },
    children: [new TextRun({
      text: '以  上',
      font: { ascii: 'Arial', eastAsia: JP_BODY },
      size: 22,
      bold: true
    })]
  }),
];

// --- Compose document ---
const doc = new Document({
  creator: 'HoppouStatus Project',
  title: '北方領土ゲームアプリ 企画書',
  description: '北対協様 ご検討用 企画書 v1',
  styles: {
    default: {
      document: {
        run: { font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 }
      }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '1F3D6E' },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '2A2A2A' },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: { ascii: 'Arial', eastAsia: JP_HEAD }, color: '4A4A4A' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1000, hanging: 280 } } } }
        ]
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 360 } } } }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: '北方領土ゲームアプリ 企画書',
            font: { ascii: 'Arial', eastAsia: JP_BODY },
            size: 18,
            color: '999999'
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
      ...overview,
      ...quizSection,
      ...flowSection,
      ...furusatoSection,
      ...monetizeSection,
      ...attachmentSection
    ]
  }]
});

const outPath = path.join(__dirname, '北方領土ゲームアプリ_企画書_v1.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Created:', outPath, '(' + buf.length + ' bytes)');
});
