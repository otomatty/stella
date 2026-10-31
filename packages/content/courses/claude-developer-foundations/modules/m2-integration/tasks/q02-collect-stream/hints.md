## ヒント1 方針

イベントを順に見て、`event.type` で分けます。本文に足すのは、`content_block_delta` のうち `delta.type` が `text_delta` のものだけです。止まった理由は、`message_delta` が届いたときに `delta.stop_reason` を覚えておきます。どちらでもないイベントは何もしません。

## ヒント2 手がかりのコード

```js
if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
  text += event.delta.text;
} else if (event.type === "message_delta") {
  stopReason = event.delta.stop_reason;
}
```
