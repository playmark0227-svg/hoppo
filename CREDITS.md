# 画像クレジット / Image Credits

本アプリ「北方領土ステータス」は、啓発・学習を目的とした非商用のデモ実装です。
画像は主に [Wikimedia Commons](https://commons.wikimedia.org/) で公開されている、
クリエイティブ・コモンズ・ライセンスまたはパブリックドメインの素材を使用しています。

すべての素材は、各ライセンスの帰属表示要件に従って掲載しています。

---

## Character / キャラクター

### `assets/characters/mascot-main.png` / `mascot-tea.png` / `mascot-face.png`
- **名称:** しろくまくん
- **モデル:** しろくま（北の海のイメージ）
- **著作者:** 久保歩夢（屋号 ViFight）
- **権利:** © 久保歩夢 / ViFight — 本アプリのために描き下ろされたオリジナルキャラクター。
- **備考:** `mascot-main.png` は正面ポーズ、`mascot-tea.png` はお茶を持つポーズ、`mascot-face.png` は
  丸型アバター・階級認定証・アプリアイコン用のバストアップ。いずれも同一の原画から生成しています。
  アプリアイコンは四島をイメージした背景の手前に同キャラクターを配置したイラストです。
  `assets/images/icon-source.png` から `scripts/render-app-icons.cjs` でPWA・LINE用サイズを生成します。

---

## Maps / 地図

### `assets/images/hoppou/four-islands-map.png`
- **Title:** Kuril Islands - Japanese claim
- **Source:** Wikimedia Commons
- **License:** Public Domain
- **Usage:** ライセンスカードの背景ウォーターマーク、啓発用の参照画像として

### `assets/images/hoppou/habomai-map.png`
- **Title:** Map of Habomai Islands
- **Source:** Wikimedia Commons (based on DEMIS Mapserver data)
- **License:** Public Domain

---

## Islands / 四島の写真

### `assets/images/hoppou/iturup-volcano.jpg` (択捉島・火山)
- **Source:** Wikimedia Commons
- **License:** CC BY-SA 4.0
- **Usage:** 「北方領土総理」ランクイメージ、ホーム画面 "四つの島" カード

### `assets/images/hoppou/iturup-coast.jpg` (択捉島・海岸)
- **Source:** Wikimedia Commons
- **License:** CC BY-SA 4.0

### `assets/images/hoppou/kunashir.jpg` / `kunashir-view.jpg` (国後島)
- **Source:** Wikimedia Commons
- **License:** CC BY-SA 3.0 / 4.0
- **Usage:** ホーム画面ヒーロー背景、ゴールドランクイメージ、"四つの島" カード

### `assets/images/hoppou/shikotan.jpg` (色丹島)
- **Source:** Wikimedia Commons
- **License:** CC BY-SA 3.0
- **Usage:** 「島民見習い」ランクイメージ、"四つの島" カード

### `assets/images/hoppou/cape-nosappu.jpg` (納沙布岬)
- **Source:** Wikimedia Commons
- **License:** CC BY 3.0
- **Usage:** 歴史クイズのサムネイル、"四つの島"（歯舞群島）カード

### `assets/images/hoppou/easternmost-point.jpg` (日本最東端)
- **Source:** Wikimedia Commons
- **License:** CC BY 2.0

---

## Nature / 自然

### `assets/images/hoppou/tufted-puffin.jpg` (エトピリカ)
- **Photographer:** Gregory Smith (via Flickr → Wikimedia Commons)
- **License:** CC BY-SA 2.0
- **Usage:** 参考素材（根室市の市の鳥・エトピリカ。配色パレットのモチーフ）

### `assets/images/hoppou/clione.jpg` (クリオネ)
- **Source:** NOAA (via Wikimedia Commons)
- **License:** Public Domain
- **Usage:** 「流氷の守り手（クリオネライセンス）」ランクイメージ

### `assets/images/hoppou/hanasaki-crab.jpg` (花咲ガニ)
- **Source:** Wikimedia Commons
- **License:** CC BY-SA 3.0
- **Usage:** 「花咲ガニ大使（ハナサキライセンス）」ランクイメージ

### `assets/images/hoppou/drift-ice.jpg` (流氷)
- **Source:** Wikimedia Commons
- **License:** CC BY 4.0
- **Usage:** しぜん・文化クイズのサムネイル

---

## Fonts / フォント

[Google Fonts](https://fonts.google.com/) より、SIL Open Font License で配布されている以下を使用：

- **Zen Maru Gothic** — 本文・見出し
- **M PLUS Rounded 1c** — 補助見出し
- **Kosugi Maru** — 補助体裁
- **Yuji Syuku** — ライセンスカードの署名欄

## 同梱ライブラリ

- Firebase Web SDK: Apache-2.0。`client/firebase-entry.js` から同梱。
- jsQR 1.4.0: Apache-2.0。`client/qr-entry.js` から同梱。
- LINE LIFF 2.31.2: LINE Developers Agreementに基づく利用。`client/line-entry.js` から同梱。公式のnpmパッケージを使用しています。

---

## ライセンス・免責事項

- 本アプリは学習・啓発を目的とした非商用のデモです。
- 画像の再掲載にあたっては、各ライセンスが求める帰属表示と改変情報を本ファイルに集約しています。
- 最適化のため、すべての画像は最大1200px、JPEG quality 80 で再圧縮しています（これは CC BY-SA 等で認められた「改変」に該当します）。
- 原画像・詳細な著作者情報は、Wikimedia Commons の該当ファイルページを参照してください。
- 誤ったクレジット・ライセンス違反等があれば、GitHub の Issue または直接のご連絡でお知らせください。速やかに修正・削除に対応します。

---

_Last updated: 2026-04_
