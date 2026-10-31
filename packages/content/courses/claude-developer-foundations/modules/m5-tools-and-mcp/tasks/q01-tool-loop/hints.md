## ヒント1 方針

`request.messages` を写した配列を履歴にして、`for` で 1 から `maxTurns` まで回します。毎回、`send({ ...request, messages })` で送り、応答の `content` を assistant の発言として足します。`stop_reason` が `"tool_use"` でなければ、そこで結果を返します。`"tool_use"` なら、`tool_use` ブロックごとに結果を作って配列に集め、1 つの user の発言として足します。`for` を抜けたら、`"max_turns"` で返します。

## ヒント2 手がかりのコード

```js
const results = [];
for (const block of message.content) {
  if (block.type !== "tool_use") continue;
  const handler = handlers[block.name];
  // handler がなければ is_error の結果、あれば実行した結果を results に入れる
}
messages.push({ role: "user", content: results });
```
