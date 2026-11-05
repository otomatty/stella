---
sourceRefs: [SRC-claude-docs-mcp-connector-20261031, SRC-claude-code-sdk-mcp-20261031]
id: 10-2-1
title: MCP をつなぐ場所
takeaway: "公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。"
introduces: []
requires: [MCP サーバー, MCP コネクター, mcp_servers, Agent SDK, mcpServers]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# MCP をつなぐ場所
<!-- ノート: MCP サーバーのツールを使う 2 つの方法を、サーバーの置き場所で選びます。 -->
---
# つながらない
社内の PC で動く MCP サーバーを、MCP コネクターで Messages API から使おうとしました。
<!-- ノート: MCP コネクターは、HTTP で公開されたサーバーにしかつなげません。 -->
---
# 置き場所で選ぶ
公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。
<!-- ノート: どちらも、自分で MCP クライアントを作らずに済みます。 -->
---
# 比べる
| | MCP コネクター | Agent SDK |
| --- | --- | --- |
| 書く場所 | リクエストの mcp_servers と tools | query の mcpServers |
| つなげるサーバー | HTTP で公開されたもの | stdio・HTTP・SSE |
| ツールの許可 | mcp_toolset の設定 | allowedTools |
<!-- ノート: Agent SDK では、アプリの中に書いたツールを MCP サーバーとして渡すこともできます。 -->
---
# MCP コネクターの制限
MCP の仕様のうち、MCP コネクターで使えるのはツールの呼び出しだけです。
<!-- ノート: 手元のプロセスのサーバーは、直接はつなげません。 -->
---
<!-- _class: summary -->
# まとめ
公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。
<!-- ノート: 試験では、サーバーがどこで動いているかの言葉を探します。 -->
