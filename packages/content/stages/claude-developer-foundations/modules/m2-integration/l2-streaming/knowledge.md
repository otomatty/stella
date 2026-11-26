---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-errors-long-requests-20261031, SRC-claude-docs-streaming-deltas-20261031, SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-handle-stream-errors-20261126]
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

**A** — finalMessage() は中でストリーミングを使い、messages.create と同じ形の応答を返します。長い処理をストリーミングなしで待つと、応答の前に通信が切れる場合があります。

</details>

### Q6. 設備点検の画面が、最初の content_block_stop で受信を止め、「完了」と表示します。長い回答が出力上限で切れた場合もそうなります。どう直しますか？
<!-- kind: single; skills: claude-streaming -->

- A. max_tokens を増やし、最初の content_block_stop で確定する
- B. ストリーミングをやめ、受け取った回答を毎回「完了」として保存する
- C. message_delta の stop_reason を控え、message_stop まで読んで、上限に届いた場合は「上限で中断」と表示する
- D. 本文が短ければ同じ依頼を送り直し、最初の content_block_stop で確定する

<details>
<summary>解答</summary>

**C** — ブロックの終わりでは受信を続けます。応答を受信し終えたら、控えた停止理由で回答を確定できるかを判定します。

</details>

### Q7. 会議メモの受信中に、HTTP 200 のあとで type が error のイベントが来ました。混雑による中断か、どこで判断しますか？
<!-- kind: single; skills: claude-streaming -->

- A. イベントの error.type が overloaded_error かを確かめる
- B. HTTP ステータスが 529 になったかを確かめる
- C. 最後に届いた本文の文字数で判断する

<details>
<summary>解答</summary>

**A** — HTTP のステータスは受信を始めたときの結果です。途中で届いた error の中にある type が原因を表します。

</details>
