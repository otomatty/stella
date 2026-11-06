## ヒント1 方針

`switch (response.stop_reason)` で値ごとに分け、同じ扱いの値(`end_turn` と `stop_sequence` など)は `case` を並べてまとめます。表にない値は `default` で `unexpected` にします。本文とツールの呼び出しは、`content` を `type` で選んでから作ります。

## ヒント2 手がかりのコード

```js
const calls = response.content
  .filter((block) => block.type === "tool_use")
  .map((block) => ({ id: block.id, name: block.name, input: block.input }));

const explanation = response.stop_details?.explanation ?? null;
```
