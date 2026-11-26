# 失敗の記録を層と原因に分ける

配送案内の応答が途中で止まったとき、アプリと API の間の失敗か、成功した応答の中身の失敗かを分けます。レッスン 8-8 のあとに取り組みます。`src/triage.js` の `triage(record)` を実装してください。

## 作るもの

`record` は 1 回の呼び出しの記録です。無い項目は `undefined` です。

| 項目 | 中身 |
| --- | --- |
| `httpStatus` | HTTP ステータスの数値 |
| `errorType` | エラーの種類。判定には使いません |
| `stopReason` | 成功した応答の停止理由 |
| `content` | 応答のブロックの配列 |
| `expectedFormat` | `"json"` か `undefined` |
| `previousRecord` | 直前の user の発言 `{ content }`。各ブロックは `type` を持ちます |

戻り値は `{ layer, mode, action }` です。HTTP のステータス、停止理由、中身の順に判定し、先に決まった行で返します。

| 記録 | layer | mode | action |
| --- | --- | --- | --- |
| 429 | integration | rate_limit | wait_and_retry |
| 529 | integration | overloaded | retry_with_backoff |
| 500 | integration | api_error | retry_with_backoff |
| 400 | integration | invalid_request | fix_request |
| 413 | integration | request_too_large | fix_request |
| 401、403 | integration | auth | fix_credentials |
| 200 かつ `max_tokens` | model | truncated | raise_limit_or_continue |
| 200 かつ `refusal` | model | refusal | try_fallback_model |
| 200 かつ `pause_turn` | integration | paused | resend_unchanged |
| 200 かつ `end_turn` かつ本文が空かつ直前の発言がツール結果のあとにテキストを足している | integration | empty_response | fix_message_assembly |
| 200 かつ `end_turn` かつ `expectedFormat` が `json` なのに本文が JSON として読めない | model | format_drift | use_structured_output |
| 200 かつ `end_turn` で、上の空の応答でも JSON の崩れでもない | none | ok | none |
| 上のどれでもない | integration | unknown | inspect_manually |

本文は、`type` が `"text"` のブロックの `text` を順につないだものです。テキストブロックが無いときも空です。空白だけの本文は空にしません。

「ツール結果のあとにテキストを足している」は、`previousRecord.content` を前から見て、`tool_result` より後ろに `text` があることです。この並びが無い空の `end_turn` は、JSON の条件に当てはまらなければ `ok` です。空で、かつ `expectedFormat` が `json` なら、JSON として読めないので `format_drift` です。空で、かつツール結果のあとにテキストがあるときは、JSON より先に `empty_response` にします。

400、413、拒否、上限は、送り直しても直りません。429 は待ってから送り直し、500 と 529 は間隔を空けて送り直します。`pause_turn` は HTTP 200 でも、応答を変えずに送り直す操作なので `integration` です。`errorType` がステータスと食い違っても、ステータスの行を使います。受け取った `record` は書き換えません。

## 確認と提出

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。テストは記録の形をした値を渡すので、API キーは要りません。テストと設定のファイルは書き換えません。

提出の説明欄に、必ず次の 2 点を書いてください。

- 警報を 5xx だけに掛けていると見逃す失敗
- 空の応答に対して上限を上げても直らない理由

## 出典

課題とテストデータは教材用に作成しています。

- HTTP ステータスと、送り直せる失敗。[Anthropic の API エラー（英語）](https://platform.claude.com/docs/en/api/errors#http-errors)
- 停止理由と HTTP エラーの違い、空の応答、一時停止、拒否と上限。[Anthropic の停止理由（英語）](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- 形が崩れたときの構造化出力。[Anthropic の構造化出力（英語）](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
