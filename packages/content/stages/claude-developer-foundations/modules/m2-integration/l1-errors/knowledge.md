---
sourceRefs: [SRC-claude-docs-errors-20261031, SRC-claude-docs-rate-limits-20261031, SRC-claude-docs-ts-sdk-20261031, SRC-claude-docs-request-size-limits-20261126]
---
## 知識問題

### Q1. 時間を置いて送り直すと通ることがあるエラーをすべて選んでください。
<!-- kind: multiple; skills: claude-api-errors -->

- A. 529(API 全体が一時的に混み合っている)
- B. 429(レート制限に届いた)
- C. 400(リクエストの形の誤り)
- D. 401(API キーの誤り)

<details>
<summary>解答</summary>

**A, B** — 429 と 529 は、時間を置いて送り直すと通ることがあります。400 と 401 は、リクエストやキーを直さない限り通りません。

</details>

### Q2. 429 の応答に retry-after ヘッダーがありました。どう送り直しますか？
<!-- kind: single; skills: claude-api-errors -->

- A. retry-after の秒数だけ待ってから送り直す
- B. すぐに送り直す
- C. 送り直さずにエラーとして利用者に出す

<details>
<summary>解答</summary>

**A** — retry-after は送り直せるまでの秒数です。これより早く送り直しても失敗します。

</details>

### Q3. 利用額の上限に届いた 429 は、待って送り直せばすぐに通ります。
<!-- kind: boolean; skills: claude-api-errors -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 利用額の上限に届いた 429 には retry-after が付かず、上限が戻るまで送り直しても通りません。送り直しに回数の上限を決めるのは、このためでもあります。

</details>

### Q4. サポートに、失敗したリクエストを問い合わせます。添えるものはどれですか？
<!-- kind: single; skills: claude-api-errors -->

- A. 応答の request ID
- B. API キー
- C. モデル ID だけ

<details>
<summary>解答</summary>

**A** — request ID はリクエストごとに付く一意の ID で、どのリクエストかを特定できます。API キーは人に渡しません。

</details>

### Q5. 夜間の一括処理で 429 を避けたいとき、応答のどこを見ますか？
<!-- kind: single; skills: claude-api-errors -->

- A. anthropic-ratelimit-requests-remaining などのレスポンスヘッダー
- B. 応答の content の最後のブロック
- C. stop_reason

<details>
<summary>解答</summary>

**A** — レスポンスヘッダーにレート制限の残りが入ります。残りが少なくなったら送る速さを落とします。

</details>

### Q6. 画像を含む月次報告を送ると 413 が返りました。集計に使う画像は全体の一部です。どこを直しますか？
<!-- kind: single; skills: claude-api-errors -->

- A. 送り直しの待ち時間を長くする
- B. 集計に要る画像を選び、送るリクエストのバイト数を減らす
- C. 出力の max_tokens を下げる

<details>
<summary>解答</summary>

**B** — 413 はリクエスト全体のバイト数の上限を超えています。添付を絞ると、送るデータが小さくなります。

</details>
