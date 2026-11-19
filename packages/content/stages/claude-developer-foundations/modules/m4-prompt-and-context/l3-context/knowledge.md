---
sourceRefs: [SRC-claude-docs-context-windows-20261031, SRC-claude-docs-context-overflow-20261031, SRC-anthropic-context-engineering-20261031, SRC-claude-docs-compaction-20261031, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. コンテキストウィンドウに数えるものをすべて選んでください。
<!-- kind: multiple; skills: claude-context-management -->

- A. system
- B. ツールの定義
- C. その回に作る出力
- D. プロンプトキャッシュで読み込んだ前半

<details>
<summary>解答</summary>

**A, B, C, D** — キャッシュで変わるのは料金で、枠の使い方は変わりません。

</details>

### Q2. 入力だけでコンテキストウィンドウを超えるリクエストを送ると、どうなりますか？
<!-- kind: single; skills: claude-context-management -->

- A. 400 の invalid_request_error になる
- B. 古いやり取りが自動で消されて処理される
- C. stop_reason が end_turn の空の応答が返る

<details>
<summary>解答</summary>

**A** — 入力と max_tokens の合計だけが超えるときは、最近のモデルでは受け付け、出力の途中で枠に届くと model_context_window_exceeded で止まります。

</details>

### Q3. コンテキストウィンドウに収まるなら、関係のありそうな資料はすべて入れたほうが答えは正確になります。
<!-- kind: boolean; skills: claude-context-management -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — トークンが増えるほど、中の情報を正しく思い出す力は落ちます。結果に効く情報だけを入れます。

</details>

### Q4. 大量のファイルを扱うエージェントに、すべてを先に入れず、要るときに読ませる方法はどれですか？
<!-- kind: single; skills: claude-context-management -->

- A. ファイルの場所のような目印だけを持たせ、ツールで必要な分だけ読ませる
- B. すべてのファイルを 1 つにつなげて system に入れる
- C. ファイルの名前を伏せて渡す

<details>
<summary>解答</summary>

**A** — 先に全部を入れるより時間はかかりますが、コンテキストを小さく保てます。

</details>

### Q5. 長い会話を枠の中に保つ方法として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-context-management -->

- A. 圧縮で、古いやり取りを Claude が書いた要約に置き換える
- B. コンテキストの編集で、古いツールの結果を消す
- C. プロンプトキャッシュを使い、枠に数えないようにする

<details>
<summary>解答</summary>

**A, B** — キャッシュした前半も枠に数えます。

</details>

### Q6. 保証の判定に使える入力は残り 2,000 トークンです。購入時の条項は 700、受付時の商品状態は 200、再取得できる過去の類似案件は 1,900 トークンです。後で判定根拠を照合する必要があります。何を引き継ぎますか？
<!-- kind: single; skills: claude-context-management -->

- A. 類似案件を全部残し、足りない条項は判断時に推測する
- B. 購入時の規約の版・該当条項と商品状態を残し、類似案件は必要時に再取得する
- C. 過去の類似案件と商品状態だけを残し、どの規約を使ったかは最新の規約から推定する

<details>
<summary>解答</summary>

**B** — 購入時の条項と状態は合計 900 トークンで収まり、その注文の根拠を確認できます。類似案件を優先すると、適用した条項を失います。類似案件と商品状態を両方残す案は 2,100 トークンになり、枠も超えます。

</details>
