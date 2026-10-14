# クイズの出典と更新方針

2026年10月15日版。アプリには入門から超難問まで12コース・100問を収録しています。設問は日本政府の公表資料に基づいてViFightが作成したもので、政府が各設問を監修・承認したことを意味しません。

| 分野 | 一次資料 |
| --- | --- |
| 島の位置・面積・地勢 | [内閣府 北方領土の姿](https://www8.cao.go.jp/hoppo/sugata/01.html) |
| 戦前の村・人口・産業 | [内閣府 戦前の姿](https://www8.cao.go.jp/hoppo/sugata/02.html) |
| 開拓・国境・占領の経緯 | [内閣府 歴史](https://www8.cao.go.jp/hoppo/mondai/02) |
| 政府の基本的立場 | [内閣府 北方領土問題](https://www8.cao.go.jp/hoppo/mondai/01.html) |
| 返還要求運動 | [内閣府 北方領土返還要求運動](https://www8.cao.go.jp/hoppo/henkan/01.html) |
| 北方領土の日 | [内閣府 2月7日について](https://www8.cao.go.jp/hoppo/henkan/02.html) |
| 条約の経緯 | [外務省 領土問題の発生まで](https://www.mofa.go.jp/mofaj/area/hoppo/hoppo_keii.html) |
| 平和条約交渉 | [外務省 日ソ・日露間の平和条約締結交渉](https://www.mofa.go.jp/mofaj/area/hoppo/hoppo_rekishi.html) |
| 1956年の署名者 | [外務省 日ソ共同宣言原文](https://www.mofa.go.jp/mofaj/gaiko/bluebook/1957/s32-shiryou-001.htm) |
| 四島交流・自由訪問・北方墓参 | [外務省 北方四島への渡航に関する枠組み](https://www.mofa.go.jp/mofaj/area/hoppo/index_4to.html) |
| 北方領土問題の説明 | [外務省 北方領土問題Q&A](https://www.mofa.go.jp/mofaj/area/hoppo/mondai_qa.html) |

`js/data.js` と `js/quiz-extra.js` が編集元です。各問題の `source` キーを実際の根拠に対応させてください。`npm run sync:quizzes` でログイン利用者用の `functions/catalog.json` を生成し、`npm test` で100問の形式、重複、出典ドメイン、ブラウザ・サーバー間の一致を検査します。これらの自動テストは設問の事実関係そのものを証明しないため、公開前と資料更新時に必ず人が原文と解説を再照合します。

古い `docs/北方領土ゲームアプリ_クイズ全47問_v1.xlsx` とその仕様書は以前の47問版の記録で、現行100問版を示す資料ではありません。対外配布には現行カタログから再出力してください。
