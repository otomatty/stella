---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-batch-20261031, SRC-claude-docs-batch-caching-20261031, SRC-claude-docs-prompt-caching-20261031, SRC-claude-docs-structured-combined-20261031, SRC-claude-docs-strict-tool-use-20261031, SRC-claude-docs-stop-vs-errors-20261031, SRC-claude-docs-errors-20261031]
---
## 知識問題

### Q1. 社内の問い合わせ画面で、長い回答を利用者が待っています。もう一方で、1 か月分の問い合わせ 5 万件の要約を、来週の会議までに作ります。組み合わせとして適切なものはどれですか？
<!-- kind: single; skills: claude-streaming, claude-batches -->

- A. 画面の回答はストリーミングで、5 万件の要約はバッチで送る
- B. どちらもバッチで送り、費用を半額にする
- C. どちらもストリーミングで、1 件ずつ送る

<details>
<summary>解答</summary>

**A** — 人が待っている応答はストリーミングで届いた順に出し、急がない大量の処理はバッチで半額にします。画面の回答をバッチにすると、利用者を待たせます。

</details>

### Q2. バッチの中のリクエストに stream: true を書くと、結果が少しずつ届きます。
<!-- kind: boolean; skills: claude-batches -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — バッチのリクエストには stream: true を書けず、書くと検証のエラーになります。バッチの結果は 1 つのファイルで返ります。

</details>

### Q3. 同じ長い手引きを付けた大量の分類をバッチで流します。キャッシュとバッチの説明として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-prompt-caching, claude-batches -->

- A. キャッシュの割引とバッチの割引は、重ねて効く
- B. バッチの中では、キャッシュは必ず当たる
- C. すべてのリクエストに同じ cache_control のブロックを入れると、当たりやすくなる
- D. バッチではキャッシュを使えないので、cache_control は外す

<details>
<summary>解答</summary>

**A, C** — 2 つの割引は重なりますが、バッチは非同期に同時に処理されるので、キャッシュは当たるとは限りません。

</details>

### Q4. バッチで共通の前半をキャッシュするとき、1 時間のキャッシュを考える理由として適切なものはどれですか？
<!-- kind: single; skills: claude-prompt-caching, claude-batches -->

- A. 1 時間のキャッシュは、5 分のものより書き込みが安いから
- B. バッチの処理は 5 分を超えることがあり、既定の 5 分では期限が切れうるから
- C. バッチでは 1 時間のキャッシュしか使えないから

<details>
<summary>解答</summary>

**B** — 1 時間のキャッシュの書き込みは、5 分のものより高くなります。それでも、処理が長引くバッチでは当たりやすくなります。

</details>

### Q5. ツールの入力の JSON が、ときどきスキーマに合いません。直し方として適切なものはどれですか？
<!-- kind: single; skills: claude-structured-output, claude-tool-design -->

- A. リクエストに output_config.format を足す
- B. ツールの定義に strict: true を付ける
- C. system に「JSON を崩さないで」と書くだけにする

<details>
<summary>解答</summary>

**B** — output_config.format が決めるのは答えの本文の形で、ツールの入力には効きません。ツールの入力の形は strict で決めます。

</details>

### Q6. ツールを呼びながら、最後に決まった形の JSON で答えさせたいです。正しいものはどれですか？
<!-- kind: single; skills: claude-structured-output, claude-tool-use -->

- A. 構造化出力と strict は同じリクエストで使えないので、2 回に分けて送る
- B. ツールに strict: true を付け、リクエストに output_config.format を書いて、1 つのリクエストで両方を使う
- C. ツールの input_schema に、答えの本文の形も書く

<details>
<summary>解答</summary>

**B** — 構造化出力(答えの形)と strict(ツールの入力の形)は、同じリクエストで一緒に使えます。

</details>

### Q7. 応答の stop_reason の説明として正しいものはどれですか？
<!-- kind: single; skills: claude-stop-reason, claude-api-errors -->

- A. 成功した応答に入り、生成がなぜ止まったかを表す
- B. 4xx・5xx のエラーのときにだけ入る
- C. 送り直してよいかを表す

<details>
<summary>解答</summary>

**A** — stop_reason は成功した応答の値です。HTTP のエラーのときは応答がないので、stop_reason は読めません。

</details>

### Q8. 送り直しの処理について、正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-stop-reason, claude-api-errors -->

- A. 529 のエラーは、時間を置いて送り直すと通ることがある
- B. stop_reason が refusal の応答は、例外の処理で拾える
- C. stop_reason が max_tokens の応答を、同じ max_tokens のまま送り直すと、また切れうる
- D. 400 のエラーは、時間を置けば通る

<details>
<summary>解答</summary>

**A, C** — 拒否は HTTP 200 の応答で届くので、例外になりません。400 はリクエストの誤りなので、直すまで通りません。

</details>
