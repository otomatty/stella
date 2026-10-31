# 解説

ストリーミングでは、本文は `content_block_delta` の差分として届きます。差分には種類があり、本文の続きは `text_delta` の `text`、ツールの入力は `input_json_delta` の `partial_json` です。`delta.type` を見ずに `delta.text` をつなぐと、ツールの入力の差分のところで `undefined` が本文に混ざります。

止まった理由は、最初の `message_start` の時点では決まっていません(`stop_reason` は `null`)。最後のほうの `message_delta` の `delta.stop_reason` で届きます。

`ping` や新しい種類のイベントは、`if` のどの条件にも当たらないので何もしません。公式ドキュメントは、知らない種類のイベントを穏やかに扱うよう求めています。
