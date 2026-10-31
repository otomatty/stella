## ヒント1 方針

`usage` の値の名前と単価の名前の組を配列にして、1 つずつ「トークン数 × 単価 ÷ 1,000,000」を足します。トークン数は `?? 0` で `null` と省略を 0 にそろえ、0 の値は単価を見ずに飛ばします。`compareCachePlans` では、1 回目と 2 回目以降の `usage` を作って `estimateCost` を呼び、2 回目以降の費用に `requests - 1` をかけます。

## ヒント2 手がかりのコード

```js
const USAGE_PRICES = [
  ["input_tokens", "input"],
  ["cache_creation_input_tokens", "cacheWrite"],
  ["cache_read_input_tokens", "cacheRead"],
  ["output_tokens", "output"],
];
```

`Number.isInteger(tokens) && tokens >= 0` で、トークン数の形を確かめられます。
