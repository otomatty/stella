# レビューの観点

- `request.messages` を写してから足しているか(受け取った配列を `push` で書き換えていないか)
- 毎回 `model`・`tools` などの項目をそのまま送っているか
- 応答の `content` を加工せずに assistant の発言として足しているか
- すべての `tool_use` に、`tool_use_id` で結んだ `tool_result` を作り、1 つの user の発言にまとめているか
- 知らないツールを `is_error: true` の結果で返しているか
- `stop_reason` が `"tool_use"` 以外で終え、`maxTurns` で必ず止まるか
- `turns` が `send` を呼んだ回数と合っているか
- 説明欄が、結果の結び方とループが止まる理由を、自分のコードに即して述べているか

よくある違反: 最初の `tool_use` だけを実行する、結果ごとに別の user の発言にする、assistant の発言を足さずに結果だけ送る、`while (true)` で上限なく回す、`tool_use_id` に `name` を書く、知らないツールで `TypeError` になる。
