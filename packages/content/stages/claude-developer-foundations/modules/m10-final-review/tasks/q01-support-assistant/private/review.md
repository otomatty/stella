# レビューの観点

- `lookupOrderTool` に `strict: true` を付け、`input_schema` で `order_id` だけを必須にし、`additionalProperties: false` にしているか
- ツールの説明が、何をし、いつ使い、何を返すかを書いているか
- `replySchema` の 3 つの項目がすべて必須で、`category` が 3 つの値に限られ、ほかの項目を認めていないか
- 毎回のリクエストに `tools` と `output_config.format` を入れ、`create` の第 2 引数で `maxRetries` を渡しているか
- `tool_use` のとき、応答の `content` を並びも中身も変えずに assistant の発言に足しているか(`thinking` ブロックを落としていないか)
- `tool_result` を `tool_use_id` で結び、1 つの user の発言にまとめて返しているか
- 知らないツールと例外を、`is_error` を付けた結果にして続けているか(ループ全体を止めていないか)
- `end_turn` のときだけ JSON を読み、`text` のブロックから読んでいるか(`content[0]` に決め打ちしていないか)
- `max_tokens`・`model_context_window_exceeded` の答えを JSON として読まずに返しているか
- `maxTurns` で呼ぶ回数を止めているか
- 429・500 以上のエラーを、アプリで重ねて送り直さずに `unavailable` で返し、それ以外を投げているか
- 説明欄が、構造化出力と strict の役割、stop_reason とエラーを分けた理由、重ねて送り直さない理由を、自分のコードに即して述べているか

よくある違反: `output_config.format` だけでツールの入力も守れると考えて `strict` を付けない、`thinking` ブロックを取り除いてから assistant の発言に足す、`tool_result` を 1 件ずつ別のリクエストで返す、`max_tokens` で切れた JSON を `JSON.parse` して例外にする、`refusal` を `try`・`catch` で拾おうとする、SDK の送り直しに加えて自前のループで 529 を送り直す、400 も送り直す。
