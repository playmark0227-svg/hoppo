# 本番接続・公開手順

この変更は GitHub の `137f91f`（v34）を土台にしています。v36は専用Firebaseに接続した試験公開です。正式公開には実端末・メール到達・運営方針の確認も必要です。

## 構成

- 静的フロント：GitHub Pages。SDKは固定した npm lockfile から `npm run build` でローカル配信用にバンドルします。
- 通常ログイン：Firebase Authentication のメール・パスワード。確認メール、パスワード再設定、永続ログイン、ログアウト。
- LINE：LIFFの生のIDトークンを callable `exchangeLineToken` に渡し、LINE verify APIで検証後、Firebaseカスタムトークンを発行。未設定時はボタンを非表示。LINEプロフィールを認証の証拠として信用しません。
- データ：Firestore。ブラウザからの書き込みは全て拒否し、Cloud Functionsが登録、ポイント、フォロー、DMを操作。
- App Check：reCAPTCHA Enterprise。全callableで必須（ローカルエミュレーター以外）。Firestoreもコンソールで強制適用してください。

## 設定状況（2026-10-14）

配信アセットはv43。最新の確認済み範囲と未完了事項は `docs/RELEASE-CHECK.md` を参照してください。

- 会社アカウントで専用プロジェクト `hoppo-status-vifight` とWebアプリを作成。
- Firestoreは東京 `asia-northeast1`、削除保護あり。ルールとインデックスは配備済み。
- Email/Passwordを有効化。利用者の明示承認により最低6文字へ変更（長めを推奨）。メール列挙保護、日本語メール設定を維持。
- 公開ドメインに限定したreCAPTCHA EnterpriseサイトキーとApp CheckのWeb設定を登録。
- 管理者がChrome画面でBlazeの請求先接続を完了。Firebase APIでも有効化を確認。
- FirestoreのApp Check強制適用は設定済み。ビルドイメージの保持期間は7日。
- 管理者の承認で専用サーバーアカウントに必要権限を設定し、13個のCloud Functionsを配備済み。秘密鍵ファイルは発行していません。
- 月10米ドルの目安として承認された月1,500円（請求通貨JPY）の予算通知を、このプロジェクトだけに設定。実績50/90/100%および月末予測100%で通知。支出の自動停止は設定していません。
- 公開可能なWeb設定を入力し `enabled: true` に変更。LINEは依頼どおりコードのみ、LIFF未設定。実メール到達は未検証。
- 13個の関数はACTIVE。`allUsers`へのInvoker付与は会社の組織ポリシーで拒否されました。管理者の明示承認を得て、組織全体のルールを変えずにこの13サービスだけGoogle推奨の `invokerIamDisabled` によるHTTP入口を設定。全サービスの正常稼働と、App Checkなしの実HTTPリクエストが401になることを確認。Firebase認証・メール確認・App Checkは保持します。
- `functions/index.cjs` の `invoker: 'private'` は `allUsers` IAM付与を避けるためです。承認後に各サービスのIAMチェックだけを別途設定し、再配備後にもHTTP入口の状態を確認してください。
- Googleは会社アカウントのMFAを2026-10-20までに設定するよう案内。本人による設定が必要。

## ポイントとコミュニティ

- 本番登録時は0ポイントから開始。端末内プレビューのポイント・NPC・DMを取り込みません。
- ログインボーナスはサーバー時刻の日本日付で1日1回。クイズはサーバー上の回答と版ごとのベスト成績で向上分のみ付与。
- イベントコードはサーバー発行・期限付き・利用者単位で1回。スタンプ付きコードは同じスタンプの再取得不可。QRだけで位置・来場を証明するものではありません。
- ランキングは公開を選んだ実ユーザーの累計獲得ポイント・上位100名。メール・地域・生年月日・自己紹介は公開しません。
- フォローは100人まで。DMは18歳以上の自己申告、双方のDM有効設定、相互フォロー、双方にブロックなしが条件。18歳未満は学習・ランキングを利用できますがDMは不可。運営方針として公開前に確認してください。
- DMは200文字、5件/分、200件/日。再送IDで重複を防止。通報は10件/日。送信回数制限は不正アクセスを完全に防ぐ保証ではありません。
- アカウント削除は直近5分以内のログインが必要。関連DMは相手側を含む会話ごと削除。通報記録は安全管理のため別管理（保存方針を公開前に確定）。
- 既存プロフィールのローカル編集は「プロフィールと公開設定を保存」でクラウドへ反映。画像・表示設定は端末内のみ。
- 実物グッズの交換・配送・送料決済は未実装。本番モードで交換処理を停止しています。

## Firebase設定

1. Firebaseプロジェクトを作成し、Webアプリを登録します。Firestoreのロケーションを選んでください（後から容易には変更できません）。Functionsは `asia-northeast1` です。
2. AuthenticationのEmail/Passwordを有効にします。承認済みドメインに `playmark0227-svg.github.io` を追加。確認・再設定メールの日本語文面、送信者と戻り先URLを設定。パスワードポリシーは承認済みの6文字以上にし、メール列挙保護を有効にします。5文字はFirebase非対応です。長めのパスワードを推奨します。
3. Cloud Functions利用の課金プラン・予算通知・監視を管理者が確認して設定します。専用プロジェクト・Blaze接続・月1,500円の予算通知は設定済み。予算通知は支出の自動停止ではありません。
4. App CheckにWebアプリとreCAPTCHA Enterpriseサイトキーを登録し、配信ドメインを承認します。
5. Node 22とJava 21以上で依存を用意して検証します。

```sh
npm ci
npm ci --prefix functions
npm run build
npm test
npm run test:rules
npm run test:integration
npx firebase login
npx firebase deploy --project YOUR_PROJECT_ID --only firestore,functions
```

6. `js/cloud-config.js` の公開可能なWeb設定 `apiKey/authDomain/projectId/appId` と `appCheckSiteKey` を入力します。サービスアカウント秘密鍵、LINEチャネルシークレット、管理用トークンはここへ絶対に入れません。
7. 通常ログインだけなら `liffId: ''` のまま。2台の実端末で登録・確認メール・再設定・フォロー・DM・ブロック・削除を確認した後、`enabled: true` に変更します。SW/アセットのバージョンも更新してください。
8. 通信先・App Check・インデックスが正常か本番で確認し、未設定表示が消えたことだけでは接続完了と判断しないでください。

## LINEを後から接続

1. LINE LoginチャネルでLIFFアプリを作成。エンドポイントに配信URLを設定し、`openid` スコープを有効にします。
2. `functions/.env.YOUR_PROJECT_ID` に `LINE_CHANNEL_ID=...` を設定（gitには含めない）。この実装のIDトークンverifyはチャネルシークレットを必要としません。
3. `js/cloud-config.js` の `liffId` を設定してFunctionsとフロントを更新。通常Webログインはそのまま残ります。
   LINEのカスタムトークン発行には、実行サービスアカウントが自分自身の署名を行う `iam.serviceAccounts.signBlob` 権限も必要です。今回のメールログインには不要なので未付与。LINE有効化時に管理者確認の上、対象サービスアカウントだけへ必要権限を設定してください。秘密鍵ファイルは不要です。
4. LINE実アカウントでトークンの期限切れ・別チャネルの拒否を検証。今回は未設定のため実LINEログインは未検証です。
5. 同じ人のメールアカウントとLINEアカウントは別アカウントです。自動的に統合しません。安全なアカウント連携は別途実装が必要です。

## イベントコード発行

管理者のApplication Default Credentialsでのみ実行します。会場名・ポイント・期限・必要ならスタンプIDを指定します。コマンドはFirestoreへ書き込むため、発行内容を確認してから実行してください。

```sh
node scripts/create-event.cjs YOUR_PROJECT_ID 'イベント名' 50 '2026-12-01T09:00:00+09:00' nosappu
```

標準出力に出た `HOPPO:...` をQR化して会場へ設置。Firestoreにはコードそのものではなくハッシュを保存します。会場内の共有QRなので転送・撮影で他人に渡る可能性があります。来場認証が必要なら受付担当者の検証や短時間更新などを追加してください。

## 公開前の必須確認

- 運営者の正式情報、連絡・削除依頼窓口、利用条件・プライバシー文面を確定。`legal.html` は未確定箇所を含む案。
- 通報の確認担当と対応時間を決める。`reports` のpendingを監視し、必要なら `users/{uid}.suspended = true` にして公開プロフィールを削除（管理者操作）。通報だけで自動対応が完了する仕組みではありません。
- Quizの出典・全設問・解説の正確性を公式資料で再確認。サーバーへの移行は教材の事実確認を意味しません。改訂時は `scripts/catalog.cjs` の版も更新して生成し直す。
- しろくま素材と地図・写真の利用権・必要なクレジットを確認。旧エリカちゃんは最新コードに戻していません。
- 古い配布用Word/Excelには旧仕様が残っています。今回のクラウド仕様と合わせた再生成は別途必要です。
- DM、通報、限度回数、学習履歴の保持期間と削除運用を確定。quizSessionsは30分で論理失効しますが自動削除は未設定、運用バッチまたはTTL用Timestampを追加して削除管理してください。
- Firebaseの本番プロジェクト・監視・予算・アクセス権・App Check強制適用・バックアップを確認。未設定のまま「本番公開済み」と案内しない。

## ローカル検証

`npm run test:rules` は所有者以外の読み取り、改ざん、第三者DM、ブロックを検査。`npm run test:integration` はメール確認、日次・QRの同時実行、クイズの再挑戦、相互フォロー、重複DM、通報、削除を実Functionsで検査します。

`tests/browser.cjs` はプレビュー3サイズ、`tests/browser-cloud.cjs` はエミュレーターの2人登録と実DM通信を検査。スクリーンショットは `docs/qa-production/` に保存。ブラウザテスト用のHTTPエミュレーター許可はテスト環境だけで、本番CSPは変更しません。LINE・実メール到達・本番App Checkはこのテストの対象外です。

開発ツール側の既知依存警告が残っていますが、本番Functions依存のnpm auditは0件でした。新しい依存の更新時にも検査してください。本番のNode22でもエミュレーターテストを行い、CIもNode22に固定しています。

## 公式資料

- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/auth/admin/create-custom-tokens
- https://developers.line.biz/en/docs/liff/using-user-profile/
