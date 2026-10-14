# 北方領土ステータス

学習、イベント参加、ライセンス、スタンプを継続して記録するPWA。運営：ViFight。政府機関の公式サービスではありません。

公開URL：https://hoppo-status.vifight.com/

LINE公式アカウント：https://lin.ee/zHLPt21

## 現在の実装

- クイズ、イベントQR、島の紹介、プロフィール・島カラー、ライセンス、スタンプ図鑑。
- メール・パスワードの通常Webログイン、登録確認メール、パスワード再設定、永続ログイン、ログアウト、アカウント削除。
- LINEログイン（LIFF→サーバー側でIDトークンを検証→Firebaseカスタム認証）と、メール確認済みアカウントからの明示的なLINE連携。LIFFとサーバー設定済み。実LINEアカウントでの一連の操作は未検証。
- LINE公式アカウントの6分割リッチメニュー。ホーム、クイズ、QR、スタンプ、ランキング、マイページに移動。
- Firebase上の実ユーザーランキング・フォロー・DM・ブロック・通報。
- ポイントのサーバー採点・日本日付での日次付与・期限付きQR・再取得対策。

**現在は試験公開です。** 専用Firebase、メールログイン、LINEログイン用API、App Check、予算通知を設定済み。実LINEアカウントでの認証・連携、複数の実端末での利用、運営窓口・保存期間・利用条件の確定は別途確認が必要です。架空の競争相手や自動返信は表示しません。端末内ポイントはクラウドに引き継ぎません。

実物グッズ交換・配送・送料決済は未実装。ふるさと納税は外部サイトの案内です。既存配布資料は旧仕様を含みます。

## 開発

```sh
npm ci
npm ci --prefix functions
npm run build
npm test
python3 -m http.server 8765
```

`http://localhost:8765/` で画面を表示。公開設定のApp Checkは公開ドメインだけを許可しているため、ローカルでクラウド操作を試すにはエミュレーター用設定が必要です（`tests/browser-cloud.cjs` 参照）。外観だけならローカル設定を `enabled: false` にしてください。UIはvanilla JS、SDKはesbuildで生成。Node22、Java21以上を推奨。

Cloud Functions・Firestoreルール・LINE・運用の接続状況は [PRODUCTION.md](PRODUCTION.md)、セキュリティは [SECURITY.md](SECURITY.md)、素材は [CREDITS.md](CREDITS.md)。クイズの出典・解説の確認、運営窓口・利用条件・保存期間は正式公開前に確定が必要です。

## 検証

```sh
npm run test:rules
npm run test:integration
node tests/browser.cjs
```

ブラウザテストには起動済みローカルサーバーとPlaywright Chromiumが必要です。`tests/browser-cloud.cjs` はAuth/Firestore/Functionsのエミュレーター内で起動します。撮影結果は `docs/qa-production/`。外部サービスへの本番接続の証明ではありません。
