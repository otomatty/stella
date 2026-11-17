---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `Number("120")` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 文字列の `"120"`
- B. 数値の `120`
- C. `true`

<details>
<summary>解答</summary>

**B** — Number は値を数値に変えます。

</details>

### Q2. `[300, 500, 200].length` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `1000`
- B. `3`
- C. `200`

<details>
<summary>解答</summary>

**B** — 配列の length は、要素の数を返します。

</details>

### Q3. 文字列の length には、あとから好きな数を入れられます。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 文字列の length は読み取り専用です。

</details>

### Q4. 正しい説明をすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `number[]` は数値の配列の型
- B. any を使えば名前の誤りも必ず見つかる
- C. 引数と戻り値の型は異なっていてもよい

<details>
<summary>解答</summary>

**A, C** — any は操作の誤りを見逃します。受け取る値と返す値を別々に確かめて型を決めます。

</details>

