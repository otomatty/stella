---
sourceRefs: [SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-containskey-20261106, SRC-mslearn-csharp-sort-20261106]
---
## 知識問題

### Q1. Array.Sort で並べたあと、同じ値はどうなりますか？
<!-- kind: single; skills: csharp-sort-kth -->

- A. 二つとも残る
- B. 一つにまとめられる

<details>
<summary>解答</summary>

**A** — 同じ値も残ります。一つにまとめる処理は、別に書きます。

</details>

### Q2. 回数が同じとき小さい値を選ぶには、回数がいまの候補より大きいときだけ候補を更新します。
<!-- kind: boolean; skills: csharp-count-mode -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 小さい方から見て、より大きい回数だけを採用します。同数で更新すると大きい値になります。

</details>

### Q3. 辞書に無いキーの値を、確認せずに読むとどうなりますか？
<!-- kind: single; skills: csharp-count-names -->

- A. 例外になる
- B. 0 が返る

<details>
<summary>解答</summary>

**A** — 読む前に ContainsKey で確認します。未登録を 0 にするのは、その確認のあとです。

</details>
