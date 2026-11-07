---
sourceRefs: [SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-indexer-20261106]
---
## 知識問題

### Q1. 隣の値を見る for の続ける条件はどれですか？
<!-- kind: single; skills: csharp-combine-neighbors -->

- A. i < n - 1
- B. i <= n

<details>
<summary>解答</summary>

**A** — i+1 を読むので、i は n-2 までです。i <= n だと配列の外を読みます。

</details>

### Q2. 空の文字列の Length はどれですか？
<!-- kind: single; skills: csharp-combine-one-string -->

- A. 0
- B. 1

<details>
<summary>解答</summary>

**A** — 空行は空文字で、長さは 0 です。全部数字か、のような判定では No になります。

</details>

### Q3. 「P より大きい」は、P と同じ点数を数えます。
<!-- kind: boolean; skills: csharp-combine-count -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — より大きい（>）は同じ値を数えません。以上（>=）が同じ値を数えます。

</details>
