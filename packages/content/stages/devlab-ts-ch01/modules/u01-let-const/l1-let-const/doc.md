---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
---

# レッスン1-1 letとconst

## このレッスンの目標

- [ ] const で値に名前を付けるコードを読める
- [ ] 右側の計算結果が左の名前に入ることを説明できる
- [ ] Math.floor で小数点以下を切り捨てる例を読める

## 1-1-2 値に名前を付ける

> **const で値に名前を付けると、計算した結果も名前に入れて使えます。**

名前で値を使えるようにしたものを「変数」と呼びます。
価格や送料に名前を付けると、金額の計算を読みやすくできます。

```ts
// 価格 price を作り、1200 を入れる
const price = 1200;
// 送料 shipping を作り、500 を入れる
const shipping = 500;
// 価格と送料を足した合計 total を作る
const total = price + shipping;
// => total は 1700
```

`=` は、右の値を左の名前に入れる印です。この操作を「代入」と呼びます。
右側が先に計算されるので、`total` には `1700` が入ります。
掛け算は `*` で書き、`price * 3` は `3600` になります。
const で作った名前には、あとから別の値を入れ直せません。

```ts
// 100 円ごとのポイント数を作る
const points = Math.floor(1980 / 100);
// => points は 19
```

割り算は `/` で書きます。まず `1980 / 100` が `19.8` になります。
Math.floor は、その数以下で最も大きい整数にします。
この例のような正の数では、小数点以下を捨てて `19` になります。
四捨五入ではないので、`20` にはなりません。

説明とコード例は教材用に独自作成しています。問1の解答コードは載せていません。

## もっと知りたい人へ

- [サバイバルTypeScript: letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const) — const による変数宣言と再代入の制限
- [サバイバルTypeScript: number型](https://typescriptbook.jp/reference/values-types-variables/number) — 整数・小数と数値の計算
