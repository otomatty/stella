# 移植元

- repository: book-narrator (隣接リポジトリから独立してビルド可能)
- commit: f6e16637721358521e36c2b1c16e4915660c5a89
- package-lock.json SHA-256: 5CBEF027F015BD5CA4D8A214CD80CAFF27AED02981F2200AB3EEDCB751E2AA08
- src/server/lib/{chapters,speech,ocr,pdf,mp3,util}.ts → 同名 src ファイル
- src/server/providers.ts → src/providers.ts (Env を注入する設定に変更、単価の固定値は継承しない)
- test/unit.test.ts の章分割・OCR・読み上げの回帰ケース → src/processing.test.ts

旧認証、users/sessions、共有メール、旧DB/R2のデータは取り込まない。Worker専用PDF/WASMとMP3はサブパスからのみimportする。Web/APIから処理実装をimportしない。

移植前の確認: typecheck・Webビルド成功。Workersテストは既存のpool/runtimeの不整合 (`cloudflare:test-internal` が見つからない) で起動失敗。STELLAでは専用Vitest config + Miniflareによる実Workerの検証を用意する。
