---
sourceRefs: [SRC-claude-docs-tool-use-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-errors-20261031]
---
## 知識問題

### Q1. 自分で定義したツールを実行するのは誰ですか？
<!-- kind: single; skills: claude-tool-use -->

- A. アプリ
- B. Claude
- C. Anthropic のサーバー

<details>
<summary>解答</summary>

**A** — Claude は tool_use ブロックで呼び出しを求めるだけです。アプリが実行して結果を返します。

</details>

### Q2. ツールの結果を返すとき、tool_result の tool_use_id に書くものはどれですか？
<!-- kind: single; skills: claude-tool-use -->

- A. 呼び出しの tool_use ブロックの id
- B. ツールの name
- C. 応答の request ID

<details>
<summary>解答</summary>

**A** — id で、どの呼び出しへの結果かを結びます。

</details>

### Q3. tool_result の返し方として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-tool-use -->

- A. tool_use を含む発言のすぐあとの user の発言で返す
- B. user の発言の content では、tool_result を先頭に並べる
- C. 1 つの応答に呼び出しが 2 つあれば、結果を 1 つの user の発言にまとめる
- D. 結果は system に書き足す

<details>
<summary>解答</summary>

**A, B, C** — 結果は会話の続きとして、user の発言で返します。

</details>

### Q4. ツールの実行で外部の API がエラーになりました。適切な扱いはどれですか？
<!-- kind: single; skills: claude-tool-use -->

- A. is_error を付けた tool_result で、何が起き、次に何をすればよいかを返す
- B. 例外を投げて、ループを止める
- C. 結果を返さずに、次のリクエストを送る

<details>
<summary>解答</summary>

**A** — Claude は失敗を受け取り、利用者への説明や別のやり方を考えます。C は tool_use に結果がないので、リクエストがエラーになります。

</details>

### Q5. ウェブ検索のサーバーツールを使うとき、アプリがすることはどれですか？
<!-- kind: single; skills: claude-tool-use -->

- A. 検索を実行する処理は要らず、結果は応答に入って返る
- B. 検索を実行し、tool_result で返す
- C. 検索に失敗したら is_error を返す

<details>
<summary>解答</summary>

**A** — サーバーツールは Anthropic の側で実行され、エラーも Claude が扱います。

</details>
