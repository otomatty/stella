# レビューの観点

- 本文に `text_delta` の差分だけをつないでいるか。`input_json_delta` を混ぜていないか
- 止まった理由を `message_delta` の `delta.stop_reason` から読んでいるか。`message_start` の値を使っていないか
- `ping` や知らない種類のイベントで例外にならないか
- 課題で求めていない処理(ブロックごとの配列づくり・ログの出力など)を残していないか

よくある違反: `event.delta.text` を `delta.type` を見ずにつなぐ、`message_start` の `message.stop_reason` を返す、知らないイベントで `throw` する。
