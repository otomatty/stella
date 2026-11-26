# 止まる条件のあるループを書く

配送状況を調べるアシスタントが、見つからない荷物を同じ伝票番号で何度も照会しています。前のツール使用の課題に続き、照会を打ち切る条件を決め、呼び出し側が止まった理由を読めるようにします。レッスン 6-4 と 6-6 のあとに取り組みます。

## 作るもの

`src/run-agent.js` の `runAgent(send, tools, options)` を実装してください。Agent SDK の結果の種別（`success`、`error_max_turns`、`error_max_budget_usd`、`error_during_execution`）にならい、ループを自分で書く練習です。

| 引数 | 中身 |
| --- | --- |
| `send(messages)` | Messages API と同じ形の `{ content, stop_reason, usage }` を返す偽の非同期関数 |
| `tools` | ツール名から関数を引くオブジェクト。関数は `input` を受け取り、文字列を返すか例外を投げます。非同期でも構いません |
| `options` | `{ prompt, maxTurns, maxBudgetUsd, priceOf }`。最初の質問、送信回数の上限、ドルで表した予算上限、`usage` から応答1回の費用を返す関数 |

最初の履歴は `[{ role: "user", content: prompt }]` です。応答を受け取るたびに費用を加算し、`content` を変えずに assistant の発言として履歴に足します。渡された配列やオブジェクトは書き換えません。

| `stop_reason` | 処理 |
| --- | --- |
| `tool_use` | `tool_use` ブロックを順に処理します。応答1回分の結果を1つの user の発言にまとめ、各 `tool_result` の `tool_use_id` に呼び出しの `id` を入れます。知らないツールや例外は、理由の文字列と `is_error: true` を付けて返します |
| `pause_turn` | user の発言を足さず、assistant の内容を履歴に残した状態で送信を続けます。連続した送り直しは3回までです。4回目の `pause_turn` が届いたら `error_during_execution` で止めます |
| `end_turn` | `success` で終わります。最後の応答の `text` ブロックだけを順につなぎます |
| ほかの値 | `error_during_execution` で止めます |

ツールの結果を順に見て、同じツール名と同じ入力でエラーが2回続いたら、今回の結果をまとめてから `error_during_execution` で止めます。入力は JSON の値として比べます。オブジェクトのキーの並びと呼び出し ID は、同じ入力かどうかに影響しません。間に成功や別の入力の失敗が入れば、連続した同じ失敗には数えません。

送信を続ける前に上限を確かめます。累積費用が予算以上なら `error_max_budget_usd`、送信回数が上限以上なら `error_max_turns` を返します。両方に達したときは予算の種別を返します。たとえば上限が2回で2回目の応答が `end_turn` なら、その応答を処理して `success` で終わります。

戻り値は `{ subtype, result, numTurns, totalCostUsd, messages }` です。`numTurns` は送信の回数、`totalCostUsd` は積み上げた費用、`messages` は最後までの履歴です。成功したときだけ `result` にテキストを入れ、それ以外は `null` にします。

たとえば、残り1回で次の応答が届いたとします。現在の履歴に assistant の発言としてこの `content` を足し、費用も加算します。続けるにはもう1回の送信が要るので、予算が残っていれば `error_max_turns` で止まります。

```js
{
  stop_reason: "pause_turn",
  content: [{ type: "server_tool_use", id: "srvtoolu_notice", name: "web_search", input: { query: "配送 運休" } }],
  usage: { input_tokens: 48, output_tokens: 24 },
}
```

## 確認と提出

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。テストは偽の送信関数とツールを渡すので、API キーは要りません。テストと設定のファイルは書き換えません。

提出の説明欄に、`subtype` を見ずに `result` を使うと何が起きるかと、回数や費用の上限に達したときに呼び出し側がどう扱うべきかを書いてください。

## 出典

課題とテストデータは教材用に作成しています。

- 応答の停止理由と一時停止した応答の続け方。 [Anthropic の停止理由の解説（英語）](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons#pause-turn)
- ツールの呼び出しと結果の対応。 [Anthropic のツール呼び出しの解説（英語）](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
- SDK でのターン・予算の上限と結果の種別。 [Anthropic のエージェントループの解説（英語）](https://code.claude.com/docs/en/agent-sdk/agent-loop#handle-the-result)
