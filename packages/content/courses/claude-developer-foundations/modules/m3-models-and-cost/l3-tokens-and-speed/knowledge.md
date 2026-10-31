---
sourceRefs: [SRC-claude-docs-token-counting-20261031, SRC-claude-docs-thinking-20261031, SRC-claude-docs-effort-set-20261031, SRC-claude-docs-latency-20261031]
---
## 知識問題

### Q1. トークン数を数える API の説明として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-token-cost -->

- A. messages.create と同じ形の入力を受け取る
- B. 無料で使える
- C. 返る値は見積もりで、実際と少しずれることがある
- D. Messages API と同じレート制限の枠を使う

<details>
<summary>解答</summary>

**A, B, C** — 1 分あたりのリクエスト数の制限はありますが、Messages API の制限とは別に数えます。

</details>

### Q2. 前のモデルで数えたトークン数を、新しいモデルの費用の見積もりにそのまま使います。
<!-- kind: boolean; skills: claude-token-cost -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 同じ文章でも、モデルによってトークン数が変わります。使うモデルで数え直します。

</details>

### Q3. effort を上げたら、答えが途中で切れるようになりました。適切な対応はどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. max_tokens を大きくし、考える過程と答えの両方が入る余地を残す
- B. thinking ブロックの中身を表示しない設定にする
- C. effort を指定したまま、max_tokens を小さくする

<details>
<summary>解答</summary>

**A** — 考える過程のトークンも max_tokens に数えます。中身を表示しなくても、考えた分のトークンは同じように数えられます。

</details>

### Q4. 費用の上限を確実に決めたいときに使うものはどれですか？
<!-- kind: single; skills: claude-model-selection -->

- A. max_tokens
- B. effort
- C. thinking ブロック

<details>
<summary>解答</summary>

**A** — effort は動きの目安で、max_tokens は出力の厳密な上限です。

</details>

### Q5. チャット画面で、利用者が待つ感じを小さくしたいです。適切な組み合わせをすべて選んでください。
<!-- kind: multiple; skills: claude-model-selection -->

- A. ストリーミングで、届いた順に表示する
- B. 速いモデルを選び、effort を下げる
- C. 短い答えを頼む
- D. Message Batches API でまとめて送る

<details>
<summary>解答</summary>

**A, B, C** — Message Batches API は急がない処理のためのもので、結果が出るまでに時間がかかることがあります。

</details>
