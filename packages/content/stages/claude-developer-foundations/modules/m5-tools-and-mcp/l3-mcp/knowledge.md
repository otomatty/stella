---
sourceRefs: [SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031, SRC-mcp-server-concepts-20261118, SRC-claude-agent-skills-20261118, SRC-claude-docs-tool-use-20261031, SRC-claude-developer-guide-v11-20261118]
---
## 知識問題

### Q1. MCP の説明として正しいものはどれですか？
<!-- kind: single; skills: claude-mcp -->

- A. ツールやデータを AI のアプリにつなぐための、公開された共通の規格
- B. Claude の新しいモデルの名前
- C. プロンプトキャッシュの設定

<details>
<summary>解答</summary>

**A** — ツールやデータを提供する側を MCP サーバーと呼びます。

</details>

### Q2. Messages API から MCP コネクターで MCP サーバーのツールを使うとき、リクエストに書くものをすべて選んでください。
<!-- kind: multiple; skills: claude-mcp -->

- A. mcp_servers に、つなぐ先の URL と名前
- B. tools に、type が mcp_toolset のツール
- C. MCP サーバーとやり取りする自作の MCP クライアント

<details>
<summary>解答</summary>

**A, B** — MCP コネクターを使えば、自分で MCP クライアントを作る必要はありません。

</details>

### Q3. 手元のプロセス(stdio)で動く MCP サーバーを、MCP コネクターで Messages API から直接使えます。
<!-- kind: boolean; skills: claude-mcp -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — MCP コネクターでつなげるのは、HTTP で公開された MCP サーバーだけです。手元のプロセスのサーバーは、Agent SDK の stdio のつなぎ方で使えます。

</details>

### Q4. Agent SDK で、mcpServers のキーを github にした MCP サーバーの list_issues ツールの名前はどれですか？
<!-- kind: single; skills: claude-mcp -->

- A. mcp__github__list_issues
- B. github.list_issues
- C. list_issues

<details>
<summary>解答</summary>

**A** — MCP のツールは mcp__サーバー名__ツール名 と呼び、この名前を allowedTools に書いて許可します。

</details>

### Q5. Agent SDK で MCP サーバーのツールを使えるようにする方法として適切なものはどれですか？
<!-- kind: single; skills: claude-mcp -->

- A. allowedTools に、要るサーバーのツールだけを書く
- B. permissionMode を bypassPermissions にする
- C. 何もしなくても使える

<details>
<summary>解答</summary>

**A** — MCP のツールは許可するまで使えません。B はほかの安全のための確認まで外れます。

</details>

### Q6. 勤怠のリモート MCP サーバーに `get_shift` と `edit_shift` があります。Web アプリは検索専用で、サーバーに増えたツールも審査してから使います。Messages API の `mcp_toolset` はどう設定しますか？
<!-- kind: single; skills: claude-mcp -->

- A. `edit_shift` だけを無効にする
- B. 既定を無効にして `get_shift` だけを有効にする
- C. 両方を有効にし、問い合わせに「検索だけ」と付ける
- D. Agent SDK の `allowedTools` を Messages API のリクエストに付ける

<details>
<summary>解答</summary>

**B** — 明日増えたツールは既定の無効を引き継ぎます。編集だけを禁止すると、新しく増えたツールは使えてしまいます。プロンプトでは許可範囲を変更できません。allowedTools は Agent SDK の設定です。

</details>

### Q7. 出張申請を取得した応答に、同じ呼び出しを示す `mcp_tool_use` と `mcp_tool_result`、最後に説明文が含まれています。既存のクライアントツール用ループに組み込むとき、どの扱いが適切ですか？
<!-- kind: single; skills: claude-mcp -->

- A. 同じ引数で取得を実行し、結果が一致したら説明文を表示する
- B. `mcp_tool_result` を user の `tool_result` に変換して必ず送り返す
- C. 実行済みの組として記録し、返った結果と説明文を利用する

<details>
<summary>解答</summary>

**C** — リモートの実行と結果の受け渡しはコネクターが済ませています。同じ引数で呼び直すと、2 回目の取得が起きます。user の tool_result を作るのは、アプリがクライアントツールを実行したときの手順です。

</details>

### Q8. 複数のアプリから参照する台帳サーバーは、URI で読む品目表と、品番を渡すと最新在庫を検索する操作を提供します。さらに、同じ社内手順と見本で報告書を作らせます。要件に合う組み合わせはどれですか？
<!-- kind: single; skills: claude-mcp, claude-tool-design -->

- A. 品目表を MCP resource、検索を MCP tool、繰り返し使う手順と見本を Skill にする
- B. 品目表を MCP prompt、検索を Skill の指示文にし、見本を最新在庫として渡す
- C. 品目表を MCP resource にし、品番の照会では MCP prompt に書いた見本の在庫数を返す

<details>
<summary>解答</summary>

**A** — URI で参照する資料と引数を伴う操作を分けられます。Skill には業務の進め方をまとめられます。指示文だけでは現在の在庫を取りに行けず、ひな形に書いた見本の値も最新の在庫を表しません。

</details>
