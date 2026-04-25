# 北方領土ステータス（Hoppou Status）

エトピリカ「エリカちゃん」と一緒に、北方領土について楽しく学ぼう！

クイズ・QRイベント・ショップ・ライセンス（階級認定証）など、ゲーミフィケーション要素満載の PWA Web アプリです。

## 🌐 ライブデモ

https://playmark0227-svg.github.io/hoppo/

## ✨ 主な機能

- 📝 **クイズ** — 北方領土の基礎・歴史・自然をクイズ形式で学習。全問正解でボーナスポイント
- 📷 **QRよみとり** — イベント会場のQRコードを読み取ってポイントゲット
- 🎁 **ショップ** — ためたポイントでアイテムと交換
- 🪪 **ライセンス** — 公式風の階級認定証。PNG画像として保存・共有も可能
- 🏅 **アチーブメント** — 12種類のかくれバッジ
- 🔥 **デイリーチェックイン** — 連続ログインボーナス（最大15pt）
- 🎉 **エフェクト** — コンフェッティ・トースト・モーダル・スライドイン通知

## 🛠️ 技術スタック

- HTML / CSS / Vanilla JavaScript（フレームワーク不使用）
- PWA（manifest.webmanifest）
- localStorage によるステート管理
- Canvas 2D（PNG ライセンス画像書き出し）
- jsQR（QRコード読み取り、CDN）

## 📁 ディレクトリ構成

```
.
├── index.html
├── manifest.webmanifest
├── css/
│   └── style.css
├── js/
│   ├── data.js          # 階級・クイズ・ショップアイテム定義
│   ├── store.js         # 状態管理（イベントバス付き）
│   ├── ui.js            # 共通UI（トースト・モーダル・コンフェッティ）
│   ├── achievements.js  # 実績判定
│   ├── quiz.js          # クイズ機能
│   ├── shop.js          # ショップ機能
│   ├── qr.js            # QR読み取り機能
│   ├── license.js       # ライセンスカード描画＆保存
│   └── app.js           # 全体初期化
├── assets/
│   ├── characters/      # エリカちゃん画像
│   └── images/          # 北方領土の写真・階級バッジ
└── CREDITS.md
```

## 🚀 ローカル実行

```bash
# 任意の静的サーバーでOK
python3 -m http.server 8765
# → http://localhost:8765
```

## 📜 ライセンス

学習目的のサンプル教育アプリです。素材は CREDITS.md に記載のライセンスに従います。

## 🐦 キャラクター

主人公「エリカちゃん」は根室の市鳥でもある **エトピリカ** をモチーフにしたオリジナルキャラクター。
オホーツクの海を見守る、ちょっと頑張り屋の女の子。

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
