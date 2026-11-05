---
sourceRefs: [SRC-claude-docs-messages-20261031, SRC-claude-docs-messages-system-20261031, SRC-claude-api-messages-create-20261031]
---
## 知識問題

### Q1. 利用者との 3 回目のやり取りを送ります。messages に入れるものはどれですか？
<!-- kind: single; skills: claude-messages-request -->

- A. それまでのやり取りすべてと、新しい発言
- B. 新しい発言だけ
- C. 直前の Claude の応答と、新しい発言だけ

<details>
<summary>解答</summary>

**A** — Messages API は会話を覚えないので、それまでのやり取りを messages の配列にまとめて毎回送ります。

</details>

### Q2. 「あなたは社内ヘルプデスクの担当者です」という役割を、会話の最初から効かせます。どこに書きますか？
<!-- kind: single; skills: claude-messages-request -->

- A. リクエストの一番上の階層の system
- B. 毎回の user の発言の先頭
- C. max_tokens

<details>
<summary>解答</summary>

**A** — 最初から効かせる役割や前提は、messages ではなく system に書きます。

</details>

### Q3. max_tokens を 1024 にしたリクエストの応答として、起こりうるものをすべて選んでください。
<!-- kind: multiple; skills: claude-messages-request -->

- A. 1024 トークンより短く答えを終える
- B. 1024 トークンに届いて、文の途中で止まる
- C. 1024 トークンを超えて書き続ける

<details>
<summary>解答</summary>

**A, B** — max_tokens は出力の上限です。上限より早く終わることはありますが、上限を超えることはありません。

</details>

### Q4. 応答の本文は `response.content[0].text` を読めば必ず取り出せます。
<!-- kind: boolean; skills: claude-messages-request -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — content はブロックの配列で、テキストのブロックが複数あることも、テキスト以外のブロックが先に来ることもあります。type が text のブロックを選んでつなぎます。

</details>
