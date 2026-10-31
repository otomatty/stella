---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-errors-long-requests-20261031, SRC-claude-docs-streaming-deltas-20261031]
---
## 知識問題

### Q1. ストリーミングを使う理由として適切なものをすべて選んでください。
<!-- kind: multiple; skills: claude-streaming -->

- A. 長い回答を、届いた文字から順に表示できる
- B. max_tokens の大きいリクエストで、長く待つ通信が切られるのを避けられる
- C. 料金が通常の半額になる

<details>
<summary>解答</summary>

**A, B** — 料金が半額になるのは Message Batches API です。

</details>

### Q2. ストリーミングで、止まった理由(stop_reason)が届くイベントはどれですか？
<!-- kind: single; skills: claude-streaming -->

- A. message_delta
- B. message_start
- C. content_block_start

<details>
<summary>解答</summary>

**A** — message_delta の delta.stop_reason に入ります。message_start の時点では、まだ止まっていません。

</details>

### Q3. 本文の続きの文字が入っているのはどれですか？
<!-- kind: single; skills: claude-streaming -->

- A. content_block_delta の delta が text_delta のときの text
- B. content_block_stop の text
- C. ping の data

<details>
<summary>解答</summary>

**A** — 本文は text_delta の差分として順に届きます。ping は本文を運びません。

</details>

### Q4. 知らない種類のイベントが届いたら、エラーとして処理を止めます。
<!-- kind: boolean; skills: claude-streaming -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 新しい種類のイベントが足されることがあるので、知らないイベントは読み飛ばします。

</details>

### Q5. 長い出力をファイルに保存するだけで、途中の表示は要りません。適切な受け取り方はどれですか？
<!-- kind: single; skills: claude-streaming -->

- A. SDK の stream を使い、finalMessage() でまとめた応答を待つ
- B. イベントを 1 つずつ自分で組み立てる
- C. max_tokens を大きくして、ストリーミングを使わずに待つ

<details>
<summary>解答</summary>

**A** — finalMessage() は中でストリーミングを使い、messages.create と同じ形の応答を返します。C は長く待つ通信が切られるおそれがあります。

</details>
