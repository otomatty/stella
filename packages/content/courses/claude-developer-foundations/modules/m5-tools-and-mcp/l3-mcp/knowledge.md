---
sourceRefs: [SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031]
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
