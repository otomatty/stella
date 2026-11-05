---
sourceRefs: [SRC-claude-code-sdk-mcp-20261031]
id: 5-3-3
title: SDK から MCP を使う
takeaway: "Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。"
introduces: [mcpServers, allowedTools]
requires: [Agent SDK, MCP サーバー]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# SDK から MCP を使う
<!-- ノート: Agent SDK で作るエージェントに、MCP サーバーのツールを持たせる方法です。 -->
---
# 見えているのに呼べない
MCP サーバーをつないだのに、エージェントがそのツールを一度も呼べませんでした。
<!-- ノート: MCP のツールは、許可するまで使えません。 -->
---
# 足して、許可する
Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。
<!-- ノート: サーバーは mcpServers の設定か、.mcp.json のファイルに書きます。 -->
---
# ツールの名前
```js
allowedTools: ["mcp__github__list_issues", "mcp__tickets__*"],
```
<!-- ノート: MCP のツールは「mcp__サーバー名__ツール名」と呼びます。* でそのサーバーのツールをまとめて許可できます。 -->
---
# つなぎ方
- 実行するコマンドがある: stdio(手元のプロセス)
- URL がある: HTTP か SSE
<!-- ノート: アプリの中に書いたツールを、SDK の MCP サーバーとして渡すこともできます。 -->
---
<!-- _class: summary -->
# まとめ
Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。
<!-- ノート: 許可は、必要なサーバーとツールだけに絞ります。 -->
