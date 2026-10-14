# 北方領土ステータス

学習、イベント参加、ライセンス、スタンプを継続して記録するPWA。運営：ViFight。政府機関の公式サービスではありません。

プレビュー：https://playmark0227-svg.github.io/hoppo/

## 現在の実装

- クイズ、イベントQR、島の紹介、プロフィール・島カラー、ライセンス、スタンプ図鑑。
- メール・パスワードの通常Webログイン、登録確認メール、パスワード再設定、永続ログイン、ログアウト、アカウント削除。
- LINEログインの追加コード（LIFF→サーバーverify→Firebaseカスタム認証）。LINE設定は未入力、実アカウントで未検証。
- Firebase上の実ユーザーランキング・フォロー・DM・ブロック・通報。
- ポイントのサーバー採点・日本日付での日次付与・期限付きQR・再取得対策。

**Firebase接続情報は未設定、`enabled: false` です。** プレビューで実ログイン・DMが開始済みという意味ではありません。架空の競争相手や自動返信は表示しません。端末内ポイントは本番に引き継ぎません。

実物グッズ交換・配送・送料決済は未実装。ふるさと納税は外部サイトの案内です。既存配布資料は旧仕様を含みます。

## 開発

```sh
npm ci
npm ci --prefix functions
npm run build
npm test
python3 -m http.server 8765
```

`http://localhost:8765/` でプレビュー。UIは既存のvanilla JS、Firebase SDKはesbuildでローカル配信用に生成し、有効設定時だけ読み込みます。Node22、Java21以上を推奨。

Cloud Functions・Firestoreルール・LINE・運用の接続手順は [PRODUCTION.md](PRODUCTION.md)、セキュリティは [SECURITY.md](SECURITY.md)、素材は [CREDITS.md](CREDITS.md)。クイズの出典・解説の確認、運営窓口・利用条件・保存期間は本番公開前に確定が必要です。

## 検証

```sh
npm run test:rules
npm run test:integration
node tests/browser.cjs
```

ブラウザテストには起動済みローカルサーバーとPlaywright Chromiumが必要です。`tests/browser-cloud.cjs` はAuth/Firestore/Functionsのエミュレーター内で起動します。撮影結果は `docs/qa-production/`。外部サービスへの本番接続の証明ではありません。
