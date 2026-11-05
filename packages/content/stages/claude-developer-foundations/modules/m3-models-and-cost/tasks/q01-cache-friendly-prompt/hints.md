## ヒント1 方針

毎回同じもの(指示と資料)を 1 つの配列 `[input.instructions, ...input.documents]` にまとめ、`map` でブロックにします。`index` が最後のときだけ `cache_control` を足します。時刻と質問は `system` に入れず、`messages` の発言にします。`usage` の値は `?? 0` で、`null` と省略を 0 にそろえてから足します。

## ヒント2 手がかりのコード

```js
const stable = [input.instructions, ...input.documents];
const system = stable.map((text, index) =>
  index === stable.length - 1
    ? { type: "text", text, cache_control: cacheControl }
    : { type: "text", text },
);
```
