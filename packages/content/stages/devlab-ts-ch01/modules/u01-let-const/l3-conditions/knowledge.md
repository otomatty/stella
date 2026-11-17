---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-functions-function-declaration]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 次のコードで表示される rest はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 残り rest を入れ直せる変数として作り、3 を入れる
let rest = 3;
// rest が 1 より大きい間くり返す
while (rest > 1) {
  // rest を 1 減らす
  rest--;
  // くり返す中身はここまで
}
// 残りを表示する
console.log(rest);
```

- A. `0`
- B. `1`
- C. `3`

<details>
<summary>解答</summary>

**B** — 3、2 のときに中身を実行します。1 > 1 は false なので、1 のまま終わります。

</details>

### Q2. 次の関数は、引数に再代入するため課題の lint でエラーになりますか？
<!-- kind: boolean; skills: devlab-ts-ch01 -->

```ts
// 関数 addStock を作り、在庫 stock を受け取る
function addStock(stock: number): number {
  // stock に 1 を足した数を入れ直す
  stock = stock + 1;
  // stock を返す
  return stock;
  // 関数の中身はここまで
}
```

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — no-param-reassign の決まりに合いません。let の別の変数に引数を写してから、その変数を更新します。

</details>

### Q3. 次のコードについて、正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

```ts
// 関数 reservationLabel を作り、会員か招待客かを受け取る
function reservationLabel(member: boolean, guest: boolean): string {
  // どちらかが true なら予約可、そうでなければ受付番号を返す
  return member || guest ? "予約可" : String(42);
  // 関数の中身はここまで
}
```

- A. `reservationLabel(false, true)` は `"予約可"`
- B. `reservationLabel(false, false)` は数値の `42`
- C. `reservationLabel(false, false)` は文字列の `"42"`
- D. `||` は両方が `true` のときだけ `true`

<details>
<summary>解答</summary>

**A, C** — || はどちらかが true なら true です。両方 false のときはコロンの右を選び、String で文字列に変えます。

</details>

### Q4. 次のコードで表示される二つの値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 点数 score を作り、6.4 を四捨五入した数を入れる
const score = Math.round(6.4);
// 評価 rating を作り、6.5 を四捨五入した数を入れる
const rating = Math.round(6.5);
// 二つの値を表示する
console.log(score, rating);
```

- A. `6 6`
- B. `7 7`
- C. `6 7`

<details>
<summary>解答</summary>

**C** — 0 以上の数では、小数部分が 0.5 未満なら小さい整数に、0.5 以上なら大きい整数にします。

</details>

### Q5. 次のコードで表示される文字列はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 関数 orderCode を作り、n を文字列にして 0 で先頭を埋める
const orderCode = (n: number) => String(n).padStart(4, "0");
// 残数 remaining を作り、20 から 3 を引いた数を入れる
const remaining = 20 - 3;
// 残数を注文番号の形にして表示する
console.log(orderCode(remaining));
```

- A. `"0017"`
- B. `"1700"`
- C. `"000017"`

<details>
<summary>解答</summary>

**A** — 先に引き算をして 17 を作ります。それを関数に渡し、文字列の先頭を 0 で埋め、全体を 4 文字にします。

</details>

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。概念を参照し、問題と解説は教材用に独自作成しています。
