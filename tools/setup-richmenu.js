#!/usr/bin/env node
/* ============================================================
   LINE リッチメニューを作成して全ユーザーの既定メニューに設定する
   ------------------------------------------------------------
   使い方:
     python3 tools/build-richmenu-image.py          # 画像を作る
     export LINE_CHANNEL_ACCESS_TOKEN='xxxxx'       # Messaging APIのトークン
     export HOPPO_LIFF_ID='2001234567-AbCdEfGh'     # LIFF ID
     node tools/setup-richmenu.js

   オプション:
     --dry-run   実際には送信せず、作られるJSONだけ表示する
     --replace   既存のリッチメニューを全部削除してから作り直す

   トークンは環境変数からのみ読み込みます。絶対にコードやコミットへ
   書かないでください（漏れると公式アカウントを乗っ取られます）。
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LIFF_ID = process.env.HOPPO_LIFF_ID || '';
const DRY = process.argv.includes('--dry-run');
const REPLACE = process.argv.includes('--replace');

const IMAGE = path.join(__dirname, 'richmenu.png');
const API = 'https://api.line.me/v2/bot';
const API_DATA = 'https://api-data.line.me/v2/bot';

// 画像 (2500x1686) を 3列 x 2行 に等分。tools/build-richmenu-image.py と必ず揃えること。
const W = 2500, H = 1686, COLS = 3, ROWS = 2;
const TW = Math.floor(W / COLS), TH = Math.floor(H / ROWS);

const TILES = [
  { label: 'ホーム',     page: 'home' },
  { label: 'クイズ',     page: 'quiz' },
  { label: 'QR読み取り', page: 'qr' },
  { label: 'ショップ',   page: 'shop' },
  { label: 'ライセンス', page: 'license' },
  { label: 'ランキング', page: 'social' },
];

function liffUrl(page) {
  // LIFF はエンドポイントURLにクエリを引き継ぐ。アプリ側は ?page= を見て遷移する。
  const base = `https://liff.line.me/${LIFF_ID}`;
  return page === 'home' ? base : `${base}?page=${encodeURIComponent(page)}`;
}

function buildMenu() {
  return {
    size: { width: W, height: H },
    selected: true,                    // 開いたときにメニューを開いた状態にする
    name: 'hoppou-status-main',        // 管理用の名前（ユーザーには見えない）
    chatBarText: 'メニュー',           // トークルーム下部のバーに出る文字
    areas: TILES.map((t, i) => ({
      bounds: {
        x: (i % COLS) * TW,
        y: Math.floor(i / COLS) * TH,
        width: TW,
        height: TH,
      },
      action: { type: 'uri', label: t.label.slice(0, 20), uri: liffUrl(t.page) },
    })),
  };
}

async function api(url, { method = 'GET', body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  if (contentType) headers['Content-Type'] = contentType;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status} ${res.statusText}\n${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const menu = buildMenu();

  if (DRY) {
    console.log(JSON.stringify(menu, null, 2));
    console.log('\n--dry-run のため送信しませんでした。');
    return;
  }

  if (!TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です。');
  if (!LIFF_ID) throw new Error('HOPPO_LIFF_ID が未設定です。');
  if (!fs.existsSync(IMAGE)) {
    throw new Error(`${IMAGE} がありません。先に python3 tools/build-richmenu-image.py を実行してください。`);
  }
  const img = fs.readFileSync(IMAGE);
  if (img.length > 1024 * 1024) throw new Error('画像が1MBを超えています。');

  if (REPLACE) {
    const { richmenus = [] } = await api(`${API}/richmenu/list`);
    for (const m of richmenus) {
      await api(`${API}/richmenu/${m.richMenuId}`, { method: 'DELETE' });
      console.log('  削除:', m.richMenuId, m.name);
    }
  }

  console.log('リッチメニューを作成中…');
  const { richMenuId } = await api(`${API}/richmenu`, {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify(menu),
  });
  console.log('  richMenuId =', richMenuId);

  console.log('画像をアップロード中…');
  await api(`${API_DATA}/richmenu/${richMenuId}/content`, {
    method: 'POST',
    contentType: 'image/png',
    body: img,
  });

  console.log('既定メニューに設定中…');
  await api(`${API}/user/all/richmenu/${richMenuId}`, { method: 'POST' });

  console.log('\n完了しました。公式アカウントのトークを開くとメニューが出ます。');
  console.log('（既にトークを開いていた場合は、一度閉じて開き直してください）');
}

main().catch((e) => {
  console.error('\n失敗しました:\n' + e.message);
  process.exit(1);
});
