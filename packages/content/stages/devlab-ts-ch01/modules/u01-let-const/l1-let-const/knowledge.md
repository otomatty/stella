---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation, SRC-typescriptbook-functions-function-declaration, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-string]
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

### Q3. `confirmedQuantity(3)` の戻り値はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

```ts
// 注文数を受け取り、その数を返す関数を作る
export function confirmedQuantity(quantity: number): number {
  // 受け取った数を返す
  return quantity;
  // 関数の中身はここまで
}
```

- A. `"3"` という文字列
- B. `3` という数値
- C. `number` という文字列

<details>
<summary>解答</summary>

**B** — 引数 quantity に数値の 3 が入り、return でその数を返します。型注釈は値の種類を示します。

</details>

### Q4. 計算結果について正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `7 / 2` は `3.5` になる
- B. `Math.ceil(2.1)` は `2` になる
- C. `800 + 400 / 2` は `1000` になる
- D. `Math.ceil(3)` は `4` になる

<details>
<summary>解答</summary>

**A, C** — 割り算では小数も出ます。割り算は足し算より先です。Math.ceil(2.1) は 3、Math.ceil(3) は 3 です。

</details>

### Q5. 次のコードは「残りは2個です」と表示しますか？
<!-- kind: boolean; skills: devlab-ts-ch01 -->

```ts
// 余り left を作り、14 を 4 で割った余りを入れる
const left = 14 % 4;
// 案内文 message を作り、余りを埋め込む
const message = `残りは${left}個です`;
// 案内文を表示する
console.log(message);
```

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 14 を 4 で割った余りは 2 です。バッククォートで囲んだ文の ${left} に、その値が文字として入ります。

</details>

参考: サバイバルTypeScript [関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)・[型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)・[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)。問題と解説は教材用に独自作成しています。
