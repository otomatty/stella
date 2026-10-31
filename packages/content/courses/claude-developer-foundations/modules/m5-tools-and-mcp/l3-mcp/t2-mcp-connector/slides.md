---
sourceRefs: [SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031]
id: 5-3-2
title: API から MCP を使う
takeaway: "MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。"
introduces: [MCP コネクター, mcp_servers, mcp_toolset]
requires: [MCP サーバー, Messages API, tools]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# API から MCP を使う
<!-- ノート: Messages API のリクエストから、MCP サーバーをつなぐ方法です。 -->
---
# つなぐ処理を書く手間
公開されている MCP サーバーを使いたいのに、つなぐための処理を自分で書こうとしていました。
<!-- ノート: MCP サーバーとやり取りする処理を、MCP クライアントと呼びます。 -->
---
# MCP コネクター
MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。
<!-- ノート: 自分で MCP クライアントを作らずに済みます。いまはベータの機能です。 -->
---
# 2 か所に書く
```js
mcp_servers: [{ type: "url", url: "https://mcp.example.com/sse", name: "tickets" }],
tools: [{ type: "mcp_toolset", mcp_server_name: "tickets" }],
```
<!-- ノート: mcp_servers につなぐ先を書き、tools の mcp_toolset で、そのサーバーのツールを使えるようにします。 -->
---
# できないこと
- MCP の機能のうち、使えるのはツールの呼び出しだけ
- 手元のプロセスの MCP サーバーはつなげない(公開された HTTP だけ)
<!-- ノート: 使うツールを絞る許可の一覧や、外す一覧も書けます。 -->
---
<!-- _class: summary -->
# まとめ
MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。
<!-- ノート: エージェントを Agent SDK で作るときは、つなぎ方が違います。 -->
