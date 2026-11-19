---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-logical-or-20261119, SRC-mdn-js-logical-not-20261119, SRC-mdn-js-return-20261119]
---

## 知識問題

### Q1. 「予約済みで、かつ受付時刻が 10 時以降なら入場できる」を表す式はどれですか？ `hasReservation` は予約済みなら `true` です。
<!-- kind: single; skills: js-condition-choice, js-logical-operators -->

- A. `hasReservation || hour >= 10`
- B. `hasReservation && hour > 10`
- C. `hasReservation && hour >= 10`

<details>
<summary>解答</summary>

**C** — 予約と時刻の両方が必要なので `&&` を使います。「以降」はちょうど 10 時を含むため `>=` です。

</details>

### Q2. 「招待状か入場券を持っていれば入場できる」という条件を `||` で書きました。入場できる場合をすべて選んでください。
<!-- kind: multiple; skills: js-logical-operators -->

- A. 招待状だけを持っている
- B. どちらも持っていない
- C. 入場券だけを持っている
- D. 両方を持っている

<details>
<summary>解答</summary>

**A, C, D** — `||` は少なくとも片方が `true` なら `true` です。両方がそろったときも入場できます。

</details>

### Q3. `isCanceled` が `true` のとき、`!isCanceled` は `false` になります。
<!-- kind: boolean; skills: js-logical-operators -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — `!` は真偽値を反転します。`true` を反転すると `false` になります。

</details>

### Q4. 注文金額を計算する関数で、`if (isCanceled) { return 0; }` を最初に書きました。取り消し済みの注文を渡すと、次に何が起きますか？
<!-- kind: single; skills: js-early-return -->

- A. 0 を返し、関数を終える
- B. 0 を返した後で金額を計算する
- C. 金額を計算し、最後に 0 を返す

<details>
<summary>解答</summary>

**A** — 取り消し済みなら `if` の中に入り、`return 0;` で関数が終わります。後ろにある金額の計算は実行されません。

</details>

### Q5. 「有効な会員証があり、残り回数が 1 回以上なら利用できる」という仕様です。`hasValidCard || remaining >= 1` では、会員証が無効でも利用できました。どこを直せばよいですか？
<!-- kind: single; skills: js-condition-repair, js-logical-operators -->

- A. `remaining >= 1` を `remaining > 1` に変える
- B. `||` を `&&` に変える
- C. `hasValidCard` を `!hasValidCard` に変える

<details>
<summary>解答</summary>

**B** — 有効な会員証と残り回数の両方が必要です。`&&` を使えば、会員証が無効なときに全体が `false` になります。

</details>
