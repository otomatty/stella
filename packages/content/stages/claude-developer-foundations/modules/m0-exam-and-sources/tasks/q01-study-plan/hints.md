## ヒント1 方針

先に配点の合計を求めます。各範囲の時間は「合計の時間 × その範囲の配点 ÷ 配点の合計」です。0.5 時間単位に丸めるには、2 倍してから整数に丸め、2 で割ります。

## ヒント2 手がかりのコード

```js
const totalWeight = domains.reduce((sum, domain) => sum + domain.weight, 0);
const hours = (totalHours * domain.weight) / totalWeight;
const rounded = Math.round(hours * 2) / 2;
```

`domains.map` の中で、範囲ごとに `{ name, hours }` を作って返します。
