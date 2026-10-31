# レビューの観点

- `stop_reason` の値で分岐しているか。応答の `content` の有無や文の中身から止まった理由を推測していないか
- `end_turn` と `stop_sequence`、`max_tokens` と `model_context_window_exceeded` を、それぞれ同じ扱いにまとめているか
- 表にない値(`pause_turn` など)を `done` などに混ぜず、`unexpected` で値ごと返しているか
- `calls` に `tool_use` のブロックだけを入れ、`{ id, name, input }` の形にしているか
- 拒否の `explanation` を `stop_details` が `null` のときも `null` で返しているか。`explanation` の文の中身で分岐していないか
- 説明欄が、自分のコードの分け方と `unexpected` の理由を述べているか(課題文の言い換えだけになっていないか)

よくある違反: `default` で `done` を返す、`content.length === 0` を拒否とみなす、`explanation.includes(…)` で分岐する、`stop_details.explanation` を `?.` なしで読んで `null` のときに例外になる。
