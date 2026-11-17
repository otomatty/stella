---
sourceRefs: [SRC-typescriptbook-values-types-variables-literal-types]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `"card" | "cash"` に入れられる値をすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `"card"`
- B. `"cash"`
- C. `"bank"`

<details>
<summary>解答</summary>

**A, B** — 書いた候補の値だけを受け付けます。

</details>

### Q2. `const SIZE = "M";` の SIZE の型はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `number`
- B. `"M"`
- C. `boolean`

<details>
<summary>解答</summary>

**B** — 型注釈なしの const の文字列は、その値そのものの型です。

</details>

### Q3. if の中の return を実行しても、関数の後ろの行を実行します。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — return でその場で関数が終わります。

</details>

### Q4. `let label = "あり";` の label の型はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `"あり"`
- B. `string`
- C. `number`

<details>
<summary>解答</summary>

**B** — 別の文字列を入れ直せるので、string という広い型になります。

</details>

