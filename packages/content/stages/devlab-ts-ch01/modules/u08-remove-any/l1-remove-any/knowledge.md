---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. 引数が any のとき、存在しないメソッドの名前を型の確認で必ず見つけられますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. はい、必ず見つかる
- B. いいえ、見落とすことがある
- C. 名前は自動で直る

<details>
<summary>解答</summary>

**B** — any はメソッドの名前を確かめません。具体的な型に直すと、存在しない名前を見つけられます。

</details>

### Q2. 文字列のプロパティ length について正しい説明はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 値を入れて文字数を変えられる
- B. 合計を表す
- C. 読み取るだけで、値は入れられない

<details>
<summary>解答</summary>

**C** — 文字列の length は読み取り専用です。等しいかを調べるときは、代入の = でなく比較の === を使います。

</details>

### Q3. `Number("28") + 4` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 数値の `32`
- B. 文字列の `"284"`
- C. 文字列の `"32"`

<details>
<summary>解答</summary>

**A** — 文字列を数値の 28 に変えてから 4 を足すので、数値の 32 になります。

</details>

### Q4. `"28" + 4` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. 数値の `32`
- B. 文字列の `"284"`
- C. 数値の `284`

<details>
<summary>解答</summary>

**B** — 文字列に + でつなぐと、数字の文字が後ろに付きます。足し算の前に Number で数値へ変えます。

</details>

### Q5. 数値の記録を順番に並べた配列の型はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `number`
- B. `number[]`
- C. `string`

<details>
<summary>解答</summary>

**B** — number[] は数値の配列です。number は数値一つの型で、角かっこを付けると並びを表します。

</details>

### Q6. `[18, 21, 19].length` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `58`
- B. `19`
- C. `3`

<details>
<summary>解答</summary>

**C** — length は並んでいる値の数です。中身を全部足した合計ではありません。

</details>
