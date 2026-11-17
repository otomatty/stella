---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
---
## 知識問題

理解の自己確認です。選考の判定には使いません。

### Q1. `"TypeScript".slice(-3)` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `"ipt"`
- B. `"Typ"`
- C. `"Script"`

<details>
<summary>解答</summary>

**A** — 後ろから三文字目を始まりにして、末尾まで取り出します。

</details>

### Q2. `"ORD-001".indexOf("#")` は何を返しますか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `0`
- B. `-1`
- C. `false`

<details>
<summary>解答</summary>

**B** — 見つからないときは -1 です。0 は先頭で見つかった位置です。

</details>

### Q3. `"B203".charAt(9)` は空の文字列を返します。
<!-- kind: boolean; skills: devlab-ts-ch01 -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — その位置に文字がないとき、charAt は空の文字列を返します。

</details>

### Q4. `"A-1-B-2"` の置き換えについて、正しいものをすべて選んでください。
<!-- kind: multiple; skills: devlab-ts-ch01 -->

- A. `.replace("-", "")` は `"A1-B-2"` を返す
- B. `.replaceAll("-", "")` は `"A1B2"` を返す
- C. `.replace(/[0-9]/g, "")` は `"A--B-"` を返す
- D. `.replace("-", "")` は `"A1B2"` を返す

<details>
<summary>解答</summary>

**A, B, C** — 文字列を渡した replace は最初だけ、replaceAll はすべての一致を置き換えます。正規表現の g も、すべての一致を扱います。

</details>

### Q5. `"  Sales-01  ".trim().toLowerCase().startsWith("sales-")` の結果はどれですか？
<!-- kind: single; skills: devlab-ts-ch01 -->

- A. `true`
- B. `false`
- C. `"sales-01"`

<details>
<summary>解答</summary>

**A** — 前後の空白を取り、小文字にそろえてから、先頭が一致するかを調べます。

</details>
