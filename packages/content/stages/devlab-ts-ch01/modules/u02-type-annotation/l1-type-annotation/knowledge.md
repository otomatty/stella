---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation]
---

## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `shippingLabel(city: string, days: number): string` に合う呼び出しはどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `shippingLabel("京都", 2)`
- B. `shippingLabel(2, "京都")`
- C. `shippingLabel("京都", "2")`

<details>
<summary>解答</summary>

**A** — 最初が文字列、次が数値です。数と順番と型をそろえます。

</details>

### Q2. `"ORD-451".slice(0, 3)` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `"ORD"`
- B. `"ORD-"`
- C. `"RD-"`

<details>
<summary>解答</summary>

**A** — 0・1・2 番目を取り出します。終わりの 3 番目は含みません。

</details>

### Q3. `"abc".length()` は文字数を返す正しい書き方です。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — length は値なので、かっこを付けません。"abc".length は 3 です。

</details>

### Q4. 次の結果のうち、正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `"◎".repeat(2)` は `"◎◎"`
- B. `"ab-7".toUpperCase()` は `"AB-7"`
- C. `(12000).toLocaleString("ja-JP")` は数値の `12000`
- D. `true && false` は `false`

<details>
<summary>解答</summary>

**A, B, D** — repeat は繰り返し、toUpperCase は大文字化です。toLocaleString の結果は文字列の "12,000" です。二つの条件は両方が真の場合だけ真になります。

</details>

### Q5. `function hasStock(stock: number): boolean` の最後の `boolean` は何を表しますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 引数の名前
- B. 戻り値の型
- C. 引数の数

<details>
<summary>解答</summary>

**B** — 閉じかっこの後ろに書く型は、返す値の種類です。

</details>
