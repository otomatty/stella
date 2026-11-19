---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119]
---

## 知識問題

### Q1. `===` で数値の `7` と文字列の `"7"` を比べると、結果はどうなりますか？
<!-- kind: single; skills: js-compare-values -->

- A. `true`
- B. `false`
- C. 数値の `7`

<details>
<summary>解答</summary>

**B** — `===` は値の型を変えずに比べます。この二つは型が異なるため、結果は `false` です。

</details>

### Q2. 「残りが 4 個以上」には、ちょうど 4 個も含まれます。
<!-- kind: boolean; skills: js-compare-values -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 「以上」を表す `>=` では、境目と等しいときも条件が成り立ちます。

</details>

### Q3. `if (seats > 0)` と `else` で空席を調べます。`seats` が 0 のとき、どちらの中の処理が実行されますか？
<!-- kind: single; skills: js-if-else -->

- A. `if`
- B. `else`
- C. 両方

<details>
<summary>解答</summary>

**B** — `0 > 0` は `false` なので、`else` の中の処理を実行します。

</details>

### Q4. 60 点で「再試験」から「合格」に切り替わります。整数の点数で、境界の直前・ちょうど・直後を確かめる入力をすべて選んでください。
<!-- kind: multiple; skills: js-boundary-test -->

- A. 58 点
- B. 59 点
- C. 60 点
- D. 61 点

<details>
<summary>解答</summary>

**B, C, D** — 60 点の直前は 59 点、直後は 61 点です。60 点も試すと、「60 点以上」に境界が含まれることを確かめられます。

</details>

### Q5. 「90 点以上は A、70 点以上は B、それ未満は C」の仕様で、95 点が B になりました。コードは `if (score >= 70)` で B、続く `else if (score >= 90)` で A を返します。仕様に合う修正はどれですか？
<!-- kind: single; skills: js-if-else, js-condition-repair -->

- A. A を返す `score >= 90` の分岐を先に置く
- B. B の `score >= 70` を `score > 70` にする
- C. A の `score >= 90` を `score > 90` にする

<details>
<summary>解答</summary>

**A** — 95 点は両方の条件を満たします。90 点以上を先に判定すると、95 点は A になり、70 点ちょうども B に含まれます。

</details>
