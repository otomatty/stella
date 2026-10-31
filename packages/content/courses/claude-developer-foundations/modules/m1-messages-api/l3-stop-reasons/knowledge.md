---
sourceRefs: [SRC-claude-docs-stop-reasons-20261031, SRC-claude-docs-refusals-20261031]
---
## 知識問題

### Q1. stop_reason が end_turn の応答は、どういう状態ですか？
<!-- kind: single; skills: claude-stop-reason -->

- A. Claude が答えを自然に終えた
- B. 出力の上限に届いて止まった
- C. Claude がツールを呼びたい

<details>
<summary>解答</summary>

**A** — end_turn は、答えを自然に終えたことを表します。B は max_tokens、C は tool_use です。

</details>

### Q2. 応答を JSON として読もうとしたら、閉じかっこが無くてエラーになりました。stop_reason を見ると max_tokens でした。適切な対応はどれですか？
<!-- kind: single; skills: claude-stop-reason -->

- A. max_tokens を上げて送り直すか、続きを書かせる
- B. 閉じかっこを足して読む
- C. 同じ max_tokens のまま、同じリクエストを送り直す

<details>
<summary>解答</summary>

**A** — max_tokens で止まった応答は途中で切れています。上限を上げて送り直すか、受け取った分に続けて書かせます。

</details>

### Q3. stop_reason が refusal の応答について、正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-stop-reason -->

- A. HTTP 200 の普通の応答として返る
- B. 例外として投げられるので、catch で受け取れる
- C. stop_details に拒否の理由が入る
- D. explanation の文の中身で処理を分ける

<details>
<summary>解答</summary>

**A, C** — 拒否はエラーではなく HTTP 200 の応答です。stop_details の explanation は変わることがあるので、表示に使い、中身で分岐しません。

</details>

### Q4. コンテキストウィンドウがいっぱいで止まった応答(model_context_window_exceeded)は、途中で切れたものとして扱います。
<!-- kind: boolean; skills: claude-stop-reason -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**A** — 公式ドキュメントは、この応答を途中で切れたものとして扱うよう案内しています。

</details>
