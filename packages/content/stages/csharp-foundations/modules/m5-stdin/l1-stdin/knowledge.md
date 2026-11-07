---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-split-20261106]
---
## 知識問題

### Q1. ReadLine が返す値の型はどれですか？
<!-- kind: single; skills: csharp-stdin-one -->

- A. 文字列
- B. int

<details>
<summary>解答</summary>

**A** — ReadLine は文字列です。整数にするには int.Parse します。

</details>

### Q2. 1行に並んだ整数を分けるときに使うのはどれですか？
<!-- kind: single; skills: csharp-stdin-split -->

- A. Split
- B. WriteLine

<details>
<summary>解答</summary>

**A** — Split で空白ごとに分けてから、それぞれ Parse します。

</details>

### Q3. 1行目の件数 N が 0 のとき、続く行は読みません。
<!-- kind: boolean; skills: csharp-stdin-count -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — N が 0 なら続く行はありません。合計の初期値 0 が残ります。

</details>
