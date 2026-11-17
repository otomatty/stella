---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 次のコードで total に入る数はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 価格 price を作り、1200 を入れる
const price = 1200;
// 送料を足した合計 total を作る
const total = price + 500;
```

- A. `1200`
- B. `1700`
- C. `500`

<details>
<summary>解答</summary>

**B** — 右側の足し算が先に行われ、その結果の 1700 が total に入ります。

</details>

### Q2. `Math.floor(19.8)` は何を返しますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `19.8`
- B. `20`
- C. `19`

<details>
<summary>解答</summary>

**C** — 小数点以下を切り捨てます。四捨五入ではないので、20 にはなりません。

</details>

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。問題と解説は教材用に独自作成しています。
