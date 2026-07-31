# セキュリティ方針（Security Policy）

## このアプリのデータの扱い

「北方領土ステータス」は **100% ブラウザ内で完結する静的 PWA** です。

- サーバーやバックエンド、ログイン機能は **ありません**。
- 利用者のデータ（ポイント・ニックネーム・履歴・DM など）は、利用者自身の端末の
  **`localStorage` にのみ** 保存されます。
- アプリはこれらのデータを **外部に一切送信しません**（`外部送信なし`）。

つまり、データは原則として「あなたの端末の中だけ」に存在します。

## 「絶対にデータが盗まれない」ことについて（正直な説明）

どんなソフトウェアであっても、**「絶対に・100% 盗まれない」と保証することはできません**。
（端末そのものを物理的に奪われる、利用者が偽サイトに情報を入力する、といった経路は
アプリ側だけでは防ぎきれません。）

その前提のうえで、このアプリで現実的に起こりうる「データ流出の経路」を洗い出し、
それぞれを多層防御（defense in depth）で塞いでいます。

## 想定される脅威と対策

| 想定脅威 | 対策 |
| --- | --- |
| **XSS**（悪意あるスクリプト注入による `localStorage` の読み取り・送信） | ① 表示前に利用者由来の文字列を必ず HTML エスケープ（名前・履歴・DM・アバター属性）。② CSP の `script-src` でインライン JS を禁止。③ **CSP `connect-src 'self'`** により、万一スクリプトが動いても外部へ送信不可。 |
| **サプライチェーン**（CDN の `jsQR` 改ざん） | `script-src` を自分自身と `cdn.jsdelivr.net` のみに限定。`connect-src 'self'` / `img-src` 制限により、改ざんされてもデータを持ち出せない。`crossorigin` / `referrerpolicy=no-referrer` を付与。 |
| **不正なインポートファイル**（細工した JSON を読み込ませる） | 既知キーのみ取り込み、ポイントは非負整数へ強制、フレーム/背景/島は既知 ID のみ許可、文字列は長さ制限、アバター画像は安全な画像 data URL（SVG 除外・200KB 以内）のみ許可。 |
| **クリックジャッキング**（iframe 埋め込み） | CSP `frame-ancestors 'none'` / `frame-src 'none'`。 |
| **通信の盗聴** | GitHub Pages の HTTPS で配信。CSP `upgrade-insecure-requests`。 |
| **参照元 URL の漏えい** | `<meta name="referrer" content="no-referrer">`。 |

## 中心的な防御：Content-Security-Policy

`index.html` の `<meta http-equiv="Content-Security-Policy">` が最重要の防御です。
特に **`connect-src 'self'`** は、「たとえ攻撃者がスクリプトを実行できたとしても、
端末内のデータを外部のサーバーへ送り出すネットワーク経路を一切持たせない」ための
要となる設定です（`fetch` / `XHR` / `WebSocket` / `sendBeacon` / 画像ビーコン等の
外部宛て通信をすべて遮断）。

## さらに堅牢にするための推奨事項（今後の課題）

このリポジトリは GitHub Pages 配信のため、HTTP レスポンスヘッダーを直接設定できません。
独自サーバーや CDN（Cloudflare 等）で配信する場合は、以下を **ヘッダーとして** 付与すると、
`<meta>` では効かない防御（`frame-ancestors` 等）も含めてさらに強化できます。

- `Content-Security-Policy`（`<meta>` と同等内容をヘッダーでも）
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Cross-Origin-Opener-Policy: same-origin` / `Cross-Origin-Resource-Policy: same-origin`
- `Permissions-Policy: camera=(self), geolocation=(), microphone=()`

また、`jsQR` を CDN から読み込む代わりに **リポジトリへ同梱（self-host）** し、
`script-src` を `'self'` のみに絞れば、サプライチェーン経路を完全に排除できます。
（同梱する場合は Subresource Integrity (SRI) のハッシュ固定も推奨。）

## 脆弱性の報告

セキュリティ上の問題を見つけた場合は、公開 issue ではなく、リポジトリ所有者へ
個別にご連絡ください。
