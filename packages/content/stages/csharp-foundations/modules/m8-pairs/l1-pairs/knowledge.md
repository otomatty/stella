---
sourceRefs: [SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-comparison-20261106]
---
## 知識問題

### Q1. 別の二つの列を組み合わせるとき、内側の繰り返しはどこから始めますか？
<!-- kind: single; skills: csharp-pairs-across -->

- A. 毎回、先頭から
- B. 前回の続きから

<details>
<summary>解答</summary>

**A** — 一つ目を変えるたびに、二つ目は先頭から見ます。続きから見ると、残りの要素を飛ばします。

</details>

### Q2. 同じ列で順序違いを同じ組にするとき、内側は次の位置から始めます。
<!-- kind: boolean; skills: csharp-pairs-same -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 次の位置から始めると、同じ位置を選ばず、逆順をもう一度数えません。

</details>

### Q3. 各行の個数を、行の外で一度だけ 0 にするとどうなりますか？
<!-- kind: single; skills: csharp-pairs-rows -->

- A. 前の行の個数が次の行に残る
- B. 各行の個数だけが出る

<details>
<summary>解答</summary>

**A** — 行ごとの数は、行が変わるたびに 0 に戻します。

</details>
