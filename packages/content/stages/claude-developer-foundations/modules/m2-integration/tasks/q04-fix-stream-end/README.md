# 途中で切れた回答を完了と表示するのを直す

問い合わせ画面が、受け取った回答を途中で「完了」と表示しています。障害の報告とイベントの記録から原因を調べ、`src/render-stream.js` の `renderStream(events)` を直してください。レッスン 2-2 の「応答の終わりを見分ける」「途中で届くエラー」のあとに取り組みます。

## 障害の報告

窓口の利用者から「受け取り場所は、と表示したところで完了になり、肝心の場所が分かりません」と連絡がありました。受信側で控えたイベントの記録から、時刻と使用量を省いた抜粋です。

| 順番 | イベントの抜粋                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------- |
| 1    | `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"受け取り場所は、"}}`   |
| 2    | `{"type":"content_block_stop","index":0}`                                                            |
| 3    | `{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}`                 |
| 4    | `{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"北口の案内所です。"}}` |
| 5    | `{"type":"content_block_stop","index":1}`                                                            |
| 6    | `{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null}}`                   |
| 7    | `{"type":"message_stop"}`                                                                            |

別の問い合わせでは、本文の差分のあとに混雑を示す `error` が記録されていましたが、画面はその場合も「完了」を表示しました。

## 直したあとの動き

`events` は 1 件の応答のイベントを受信順に並べた配列です。戻り値の形は `{ text, status, detail }` です。

- `content_block_delta` のうち `text_delta` の `text` を届いた順につなぎます。`thinking_delta` と `input_json_delta` は読み飛ばします。ブロックが閉じても次のイベントへ進みます。
- `message_delta` の `delta.stop_reason` に値が届いたら控え、`message_stop` を受け取った時点で下の表の状態を返します。
- 途中で `error` を受け取ったら、その時点までの本文と `status: "failed"`、`detail` に `error.type` を返します。
- `message_stop` も `error` も届かずに配列が終わったら、その時点までの本文と `status: "interrupted"`、`detail: null` を返します。
- `ping` と知らない種類のイベントは読み飛ばします。

| 停止理由                                      | `status`      | `detail`                                    |
| --------------------------------------------- | ------------- | ------------------------------------------- |
| `end_turn`、`stop_sequence`                   | `"complete"`  | `null`                                      |
| `max_tokens`、`model_context_window_exceeded` | `"truncated"` | `null`                                      |
| `refusal`                                     | `"refused"`   | `null`                                      |
| それ以外                                      | `"unknown"`   | 届いた停止理由。値が届いていなければ `null` |

上の記録では `{ text: "受け取り場所は、北口の案内所です。", status: "complete", detail: null }` を返します。修正は `src/render-stream.js` の受信処理に絞ります。

## 修正記録に書くこと

| 項目         | 書くこと                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| 再現の手順   | 使ったイベントの列と、修正前に実際に返った値                                     |
| 期待する動き | そのイベントの列で返すべき本文と状態                                             |
| 原因         | 記録のどのイベントから先が読まれなかったか、コードのどこで読み取りが止まったか   |
| 直したこと   | 受信を終える条件と、停止理由やエラーの扱いをどう変えたか                         |
| 再発の確認   | 障害が再現しないことと、正常に終わる応答を引き続き表示できることを確かめたテスト |

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。修正前でも、本文が 1 ブロックの正常な応答のテストは通ります。テストは受信済みのイベントを渡すので、API キーは要りません。

## 参照元

- [イベントの順序と差分の形式（英語）](https://platform.claude.com/docs/en/build-with-claude/streaming#event-types)
- [停止理由の一覧（英語）](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
- [ストリーム途中のエラー（英語）](https://platform.claude.com/docs/en/api/handle-errors#handle-an-error-in-a-stream)
