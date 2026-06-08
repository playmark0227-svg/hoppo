// Build 北方領土ゲームアプリ 画面遷移図および主要機能スクリーンショット 別紙
// Run: node build-screens-doc.js
const path = require('path');
const fs = require('fs');

const docxPath = '/opt/homebrew/lib/node_modules/docx';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat, ImageRun,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak
} = require(docxPath);

const SS = path.join(__dirname, 'screenshots');
const JP_HEAD = 'Yu Gothic';
const JP_BODY = 'Yu Mincho';

// --- Helpers ---
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

const caption = (text) =>
  new Paragraph({
    spacing: { before: 60, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, italics: true, color: '666666' })]
  });

const bullet = (text, lvl = 0) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: lvl },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 21 })]
  });

const numbered = (text) =>
  new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 60, line: 300 },
    children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  });

function imageParagraph(filename, opts = {}) {
  const data = fs.readFileSync(path.join(SS, filename));
  // For mobile portrait (390x844 @2x = 780x1688): target ~280px wide ≈ 460px height
  // For desktop landscape (1280x800): target ~520px wide ≈ 325px height
  const isMobile = filename.includes('mobile');
  const width = isMobile ? (opts.width || 260) : (opts.width || 520);
  const height = isMobile ? Math.round(width * 844 / 390) : Math.round(width * 800 / 1280);
  return new Paragraph({
    spacing: { before: 80, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({
      type: 'png',
      data,
      transformation: { width, height },
      altText: { title: opts.title || filename, description: opts.title || filename, name: filename }
    })]
  });
}

// Side-by-side images via table
function imageRow(images) {
  // images: [{ file, caption }]
  const TABLE_WIDTH = 9360;
  const colW = Math.floor(TABLE_WIDTH / images.length);
  const cells = images.map(img => {
    const data = fs.readFileSync(path.join(SS, img.file));
    const isMobile = img.file.includes('mobile');
    const widthPx = isMobile ? 220 : 440;
    const heightPx = isMobile ? Math.round(widthPx * 844 / 390) : Math.round(widthPx * 800 / 1280);
    return new TableCell({
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }
      },
      width: { size: colW, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 60, right: 60 },
      verticalAlign: VerticalAlign.TOP,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({
            type: 'png',
            data,
            transformation: { width: widthPx, height: heightPx },
            altText: { title: img.caption, description: img.caption, name: img.file }
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 0 },
          children: [new TextRun({ text: img.caption, font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 19, italics: true, color: '666666' })]
        })
      ]
    });
  });
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: images.map(() => colW),
    rows: [new TableRow({ children: cells })]
  });
}

// ASCII flow diagram (rendered as monospace box)
function asciiBlock(lines) {
  return lines.map((line, i) =>
    new Paragraph({
      spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 200 : 0 },
      alignment: AlignmentType.LEFT,
      indent: { left: 360 },
      children: [new TextRun({
        text: line.replace(/ /g, ' '),
        font: { ascii: 'Menlo', eastAsia: 'Yu Gothic Mono' },
        size: 18,
        color: '2A2A2A'
      })]
    })
  );
}

// ============================ Sections ============================

const titleBlock = [
  new Paragraph({
    spacing: { before: 400, after: 80 },
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: '2026年5月27日', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, color: '666666' })]
  }),
  new Paragraph({
    spacing: { after: 0 },
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: '別紙 ②', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 20, color: '666666' })]
  }),
  new Paragraph({
    spacing: { before: 800, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '北方領土ゲームアプリ', font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 36, bold: true, color: '1F3D6E' })]
  }),
  new Paragraph({
    spacing: { before: 0, after: 600 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '画面遷移図および主要機能スクリーンショット', font: { ascii: 'Arial', eastAsia: JP_HEAD }, size: 28, bold: true, color: '1F3D6E' })]
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
    children: [new TextRun({ text: '対応端末： PC ／ スマートフォン （PWA）', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22 })]
  }),
  new Paragraph({
    spacing: { after: 400 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'URL： https://playmark0227-svg.github.io/hoppo/', font: { ascii: 'Arial', eastAsia: JP_BODY }, size: 22, color: '1F3D6E' })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

const introSection = [
  h1('1. 本書について'),
  para('本書は「北方領土ゲームアプリ（仮称：北方領土ステータス）」の主要画面の構成および画面遷移の流れを、実機スクリーンショットとともに整理した別紙です。'),
  para('実機の動作はオンライン上で確認可能です。'),
  bullet('動作確認URL：https://playmark0227-svg.github.io/hoppo/'),
  bullet('PC（横幅 1100px 以上）：サイドバー型ダッシュボード'),
  bullet('スマートフォン（〜 767px）：上部バー＋ボトムナビ'),
  bullet('タブレット（768〜1099px）：中間レイアウト'),
];

const navSection = [
  h1('2. 画面遷移の全体像'),
  para('ユーザーがアプリにアクセスしてからの基本導線は次のとおりです。すべての画面はサイドバー（PC）またはボトムナビ（スマホ）から相互に行き来できます。'),

  h3('2.1 メイン6画面とサブモーダル'),
  ...asciiBlock([
    '┌─────────────────────────────────────────────────────────┐',
    '│                  メインナビゲーション（6画面）           │',
    '└─────────────────────────────────────────────────────────┘',
    '',
    '  ① ホーム      … ステータス・ランク・ヒーロー・統計',
    '  ② クイズ      … カテゴリ選択 → 設問 → 結果',
    '  ③ QR読み取り  … カメラ起動 or 手入力',
    '  ④ ショップ    … ポイント交換 / ふるさと納税',
    '  ⑤ ライセンス  … 階級カード・全階級一覧・実績',
    '  ⑥ 設定       … プロフィール・アバター・表示設定 等',
    '',
    '┌─────────────────────────────────────────────────────────┐',
    '│                  サブ画面（モーダル）                    │',
    '└─────────────────────────────────────────────────────────┘',
    '',
    '  ・島詳細モーダル    （ホーム四島カードから）',
    '  ・実績詳細モーダル  （ライセンス内のアチーブメントから）',
    '  ・ポイント履歴モーダル（ヘッダー・サイドバーのポイントから）',
    '  ・クレジットモーダル（設定 → アプリについて から）',
    '  ・ログインボーナスモーダル（毎日1回、初回起動時）',
  ]),

  h3('2.2 主な操作フロー'),
  numbered('アプリ起動 → ホーム画面でステータスを確認'),
  numbered('クイズに挑戦 → ポイント獲得（全問正解で +50pt ボーナス）'),
  numbered('イベント会場のQRコードを読み取り → ポイント獲得'),
  numbered('ショップでポイントを実物グッズと交換、またはふるさと納税情報を確認'),
  numbered('累計ポイントに応じてランクが5段階で自動昇格'),
  numbered('ライセンス画面で現在の階級カードと全階級一覧を確認'),
];

// ===== Mobile screenshots section =====
const mobileSection = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('3. スマートフォン版 主要画面'),

  h3('3.1 ホーム画面'),
  para('ヒーローシーン（エリカちゃん）・ランク状態カード・クイックタイル（4機能）・統計（クイズ挑戦・イベント・連続ログイン・累計）・四島カード・お知らせ。'),
  imageParagraph('01-mobile-home.png', { title: 'ホーム画面（スマホ）' }),
  caption('図 3-1：ホーム画面'),

  h3('3.2 クイズ一覧画面'),
  para('全6カテゴリのクイズ。各カードに設問数バッジ。タップで設問画面へ。'),
  imageParagraph('02-mobile-quiz-list.png', { title: 'クイズ一覧（スマホ）' }),
  caption('図 3-2：クイズカテゴリ一覧'),

  h3('3.3 クイズ実施画面'),
  para('1問ずつ表示。4択選択 → 即時正誤フィードバック → 解説 → 次の問題へ。全問終了で結果画面とポイント加算。'),
  imageParagraph('03-mobile-quiz-play.png', { title: 'クイズ実施（スマホ）' }),
  caption('図 3-3：クイズ設問画面'),

  h3('3.4 QR読み取り画面'),
  para('カメラ起動でQRコードをスキャン、もしくは手入力でコード文字列を入力。会場限定コードでポイント獲得。'),
  imageParagraph('04-mobile-qr.png', { title: 'QR読み取り（スマホ）' }),
  caption('図 3-4：QR読み取り画面'),

  h3('3.5 ショップ（ポイント交換タブ）'),
  para('累計ポイントで交換できるグッズの一覧。獲得済み／交換可能／不足ポイントの3状態をボタンで明示。'),
  imageParagraph('05-mobile-shop-points.png', { title: 'ショップ ポイント交換（スマホ）' }),
  caption('図 3-5：ショップ（ポイント交換）'),

  h3('3.6 ショップ（ふるさと納税タブ）'),
  para('根室市の返礼品10種を学習・参考情報として表示。詳細ボタンで根室市公式ふるさと納税ページ（furusato-tax.jp）へ別タブ遷移。'),
  imageParagraph('06-mobile-shop-furusato.png', { title: 'ショップ ふるさと納税（スマホ）' }),
  caption('図 3-6：ショップ（ふるさと納税）'),

  h3('3.7 ライセンス画面'),
  para('Canvas で描画される公式ライセンスカード。ユーザー名・ID・累計ポイント・発行日・四島背景。下部に階級一覧・実績一覧が続く。'),
  imageParagraph('07-mobile-license.png', { title: 'ライセンス（スマホ）' }),
  caption('図 3-7：ライセンスカード'),

  h3('3.8 設定画面（プロフィール）'),
  para('プロフィール（ニックネーム・自己紹介・地域・誕生日）の編集、画像アップロード、フレーム色・背景パターン・推しの島の選択、表示設定トグル、データ管理。'),
  imageParagraph('08-mobile-settings-top.png', { title: '設定画面 上部（スマホ）' }),
  caption('図 3-8：設定（基本情報）'),

  h3('3.9 設定画面（アバター画像アップロード）'),
  para('プロフィール画像は端末内のみで保存（外部送信なし）。アップロード時は正方形に自動クロップ → 320×320 px に縮小 → JPEG 化（約 30〜80KB）。'),
  imageParagraph('09-mobile-settings-avatar.png', { title: 'アバター設定（スマホ）' }),
  caption('図 3-9：設定（アバター画像アップロード）'),

  h3('3.10 島詳細モーダル'),
  para('ホーム画面で四島カードをタップすると開く。写真・面積・地形・最高峰など基礎データと解説本文を表示。'),
  imageParagraph('10-mobile-island-modal.png', { title: '島詳細モーダル（スマホ）' }),
  caption('図 3-10：島詳細モーダル（択捉島の例）'),

  h3('3.11 ポイント履歴モーダル'),
  para('ヘッダー（スマホ）またはサイドバー（PC）のポイントチップをタップで履歴を表示。最新50件まで日時・項目・増減を確認できる。'),
  imageParagraph('11-mobile-history-modal.png', { title: 'ポイント履歴モーダル（スマホ）' }),
  caption('図 3-11：ポイント履歴モーダル'),
];

// ===== Desktop screenshots section =====
const desktopSection = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('4. PC版 主要画面'),
  para('PC版（横幅 1100px 以上）は左サイドバー型ダッシュボードレイアウトを採用。ボトムナビは非表示、サイドバーが恒常的に表示される。'),

  h3('4.1 ホーム画面'),
  para('左サイドバーにブランド・プロフィール・縦ナビ・ポイントカードを配置。右側メインエリアにヒーロー → ランクと統計 → クイックタイル → 四島カード → お知らせ の順に配置。'),
  imageParagraph('12-desktop-home.png', { title: 'ホーム画面（PC）' }),
  caption('図 4-1：PC版ホーム画面（ダッシュボードレイアウト）'),

  h3('4.2 クイズ一覧画面'),
  para('カードは2列グリッド。設問数バッジは右側にコーラル色のピル状で表示。'),
  imageParagraph('13-desktop-quiz-list.png', { title: 'クイズ一覧（PC）' }),
  caption('図 4-2：PC版クイズ一覧'),

  h3('4.3 ショップ画面（ポイント交換 / ふるさと納税）'),
  para('上部にポイント残高、その下に2タブ（ポイント交換／ふるさと納税）。グッズは3〜4列グリッドで表示。'),
  imageParagraph('14-desktop-shop-points.png', { title: 'ショップ（PC・ポイント）' }),
  caption('図 4-3：PC版ショップ（ポイント交換タブ）'),
  imageParagraph('15-desktop-shop-furusato.png', { title: 'ショップ（PC・ふるさと納税）' }),
  caption('図 4-4：PC版ショップ（ふるさと納税タブ）'),

  h3('4.4 ライセンス画面'),
  para('Canvas 製のライセンスカードを大きく表示。下部に5段階の階級一覧と全12実績の獲得状況を一望できる。'),
  imageParagraph('16-desktop-license.png', { title: 'ライセンス（PC）' }),
  caption('図 4-5：PC版ライセンス画面'),

  h3('4.5 設定画面'),
  para('左ペインに左サイドバー、右ペインに設定セクション（基本情報・アバター・推しの島・表示と体験・データ・アプリについて）。'),
  imageParagraph('17-desktop-settings.png', { title: '設定（PC）' }),
  caption('図 4-6：PC版 設定画面'),
];

const noteSection = [
  new Paragraph({ children: [new PageBreak()] }),
  h1('5. 補足'),

  h3('5.1 データの取り扱い'),
  bullet('ユーザーデータは端末内（ブラウザ localStorage）のみで保管します。'),
  bullet('外部サーバーへの送信は一切行いません。'),
  bullet('個人情報の取得・登録・サーバー保管はありません。'),

  h3('5.2 アクセシビリティ・体験設定'),
  bullet('効果音／紙吹雪／バイブレーション／モーション控えめ／高コントラスト の各オプションを設定画面で個別にON/OFFできます。'),
  bullet('「モーション控えめ」設定時は装飾アニメーションを抑制します。'),

  h3('5.3 動作環境'),
  bullet('PWA 対応：iPhone / Android / Windows / macOS の主要ブラウザで動作。'),
  bullet('カメラ機能：HTTPS 配信下でのカメラAPI（getUserMedia）を使用。'),
  bullet('オフライン：基本UIはサービスワーカー登録時にキャッシュ動作。'),

  new Paragraph({ spacing: { before: 400 }, children: [] }),
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
  title: '画面遷移図および主要機能スクリーンショット',
  description: '北対協様 ご検討用 別紙②',
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
          style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1000, hanging: 280 } } } }
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
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: '別紙② 画面遷移図および主要機能スクリーンショット',
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
      ...introSection,
      ...navSection,
      ...mobileSection,
      ...desktopSection,
      ...noteSection,
    ]
  }]
});

const outPath = path.join(__dirname, '北方領土ゲームアプリ_別紙②_画面遷移とスクリーンショット_v1.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Created:', outPath, '(' + Math.round(buf.length / 1024) + ' KB)');
});
