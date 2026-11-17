---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `false || true` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `true`
- B. `false`
- C. `0`

<details>
<summary>解答</summary>

**A** — どちらか一方が真なら、またはの結果は真です。

</details>

### Q2. `true && !true` は false です。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — でないで偽になり、両方が真にはなりません。

</details>

### Q3. `/\d/.test("R-24")` は何を返しますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `false`
- B. `true`
- C. `24`

<details>
<summary>解答</summary>

**B** — 数字を含むので真です。全体が数字である必要はありません。

</details>

### Q4. 戻り値が boolean の関数で返せる式をすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `3 > 0`
- B. `true && false`
- C. `3`

<details>
<summary>解答</summary>

**A, B** — 比べる式と真偽値の組み合わせは真偽値です。数値そのものは返せません。

</details>

