# format 2 の固定見本

テスト時に一時フォルダーの `stages/dev-env-basics/` へ写して使う。
`m0-first-page` はコミット `7ac9a49` の承認済み単元（課題 1 つ）。
`u00-start` は公開範囲を確かめるための小さな単元（スライド・まとめ・知識問題各 1 つ、課題なし）。
実教材を増やす際には、この見本を書き換えない。

台帳は `packages/content/` の `sources/registry.json`・`environments/`・`skills.json`・`patterns.json` を一時フォルダーへ写す。
見本が使う ID は manifest の組み立てで検査する。
`references.json` の `contentHash` は、この配置と台帳で `unitContentHash` により計算した値。
見本そのものを改訂するときだけ、内容を確認して更新する。テスト実行時には計算値で上書きしない。

通常の seed・PDF は `buildContentManifest()` の既定の `stages/` のみを読む。
`content:check` の列挙も `stage-roots.mjs` などの `stages/` 起点で、このフォルダーは対象外。
`SEED_INPUT_PATHS` にも含めない（`format-2.test.ts` で確認する）。
