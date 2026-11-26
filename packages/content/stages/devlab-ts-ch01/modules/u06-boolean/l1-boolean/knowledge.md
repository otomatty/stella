---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values, SRC-typescriptbook-builtin-api-regexp]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `true && false` をそのまま return すると、何を返しますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `true`
- B. `false`
- C. 何も返さない

<details>
<summary>解答</summary>

**B** — 両方が真ではないので、式の結果は false です。if で返し分けなくても、その結果を返せます。

</details>

### Q2. 戻り値が boolean の関数で返せる式をすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `3 > 0 || 2 > 5`
- B. `true && !true`
- C. `3`

<details>
<summary>解答</summary>

**A, B** — 比較や真偽値を組み合わせた式の結果は真偽値です。`!true` は false になり、真偽が逆になります。数値の3は、そのまま返せません。

</details>

### Q3. `(false && true) || (true && true)` の結果は true です。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 左の組は false、右の組は true です。またはでつなぐと、片方の組が真なので全体も真です。

</details>

### Q4. `/\d/.test("棚6南")` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `false`
- B. `true`
- C. `"6"`

<details>
<summary>解答</summary>

**B** — 数字の6が含まれるので true です。文字列全体が数字である必要はありません。

</details>

### Q5. 英大文字を探す式で、true になるものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `/[A-Z]/.test("deskQ")`
- B. `/[A-Z]/.test("desk")`
- C. `/[A-Z]/.test("84T")`

<details>
<summary>解答</summary>

**A, C** — 一つ目にはQ、三つ目にはTがあります。二つ目は小文字だけなので false です。

</details>

### Q6. `"64".includes("2")` と `/\d/.test("64")` の結果は同じです。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 決まった文字の2はないので includes は false です。数字は含まれるので test は true になります。

</details>
