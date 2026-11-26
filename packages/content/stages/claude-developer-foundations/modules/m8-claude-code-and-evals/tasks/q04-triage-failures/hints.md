## ヒント1 先に決まる段

HTTP ステータスが 200 でなければ、停止理由は見ません。200 なら停止理由、`end_turn` のときだけ本文を見ます。

## ヒント2 空の応答の印

本文はテキストブロックだけをつなぎます。直前の発言は、`tool_result` を見てから、その後ろに `text` があるかを見ます。

```js
if (block.type === "tool_result") seenToolResult = true;
else if (seenToolResult && block.type === "text") return true;
```
