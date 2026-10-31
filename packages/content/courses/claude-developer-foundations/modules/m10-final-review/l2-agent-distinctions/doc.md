---
sourceRefs: [SRC-claude-docs-mcp-connector-20261031, SRC-claude-code-sdk-mcp-20261031, SRC-anthropic-effective-agents-20261031, SRC-anthropic-effective-agents-defs-20261031]
---
# レッスン10-2 エージェントの作りを見分ける

## このレッスンの目標

- [ ] MCP サーバーの置き場所から、MCP コネクターと Agent SDK のどちらでつなぐかを選べます。
- [ ] 仕事の形から、ワークフローとエージェントのどちらで作るかを選べます。

このレッスンでは、M5・M6 で学んだつなぎ方と作り方のうち、選択肢に並びやすい組を選び分けます。

## 10-2-1 MCP をつなぐ場所

> **公開された MCP サーバーは MCP コネクターで API から使い、手元で動く stdio のサーバーは Agent SDK でつなぎます。**

MCP サーバーのツールを使う方法は 2 つあります。MCP コネクター(5-3-2)は Messages API の機能で、Agent SDK(5-3-3)は自分のエージェントの設定です。どちらも、自分で MCP クライアントを作らずに済みます。違いは、つなげるサーバーの置き場所です。

| | MCP コネクター | Agent SDK |
| --- | --- | --- |
| 書く場所 | リクエストの `mcp_servers`(つなぐ先)と `tools` の `mcp_toolset`(使うツール) | `query` の `mcpServers`(か `.mcp.json`) |
| つなげるサーバー | HTTP(Streamable HTTP か SSE)で公開されたもの | stdio(手元のプロセス)・HTTP・SSE。アプリの中に書いたツールも渡せる |
| ツールの許可 | `mcp_toolset` で、すべて・許可の一覧・禁止の一覧を決める | `allowedTools` に `mcp__サーバー名__ツール名` を書く |

MCP コネクターには、次の制限があります。

- MCP の仕様の機能のうち、使えるのはツールの呼び出しだけです。
- サーバーは HTTP で公開されている必要があります。手元の stdio のサーバーは、直接つなげません。

問題文に「社内の PC で動く」「`npx …` で起動する」とあれば stdio のサーバーで、Agent SDK でつなぎます。「URL で公開されている」サーバーを、エージェントを作らずに Messages API の 1 回のリクエストから使うなら、MCP コネクターが向きます。

## 10-2-2 手順を前もって書けるか

> **手順を前もって書ける仕事はワークフローで、柔軟な判断が要る仕事はエージェントで作ります。**

ワークフローは手順をコードで決める仕組みで、エージェントは手順を Claude に任せる仕組みです(6-1-1)。どちらにするかは、手順を前もってコードに書けるかで決めます。

| 仕事の形 | 選ぶもの | 戻るトピック |
| --- | --- | --- |
| 毎回同じ段で処理する | プロンプトの連鎖 | 6-2-1 |
| 入力の種類ごとに扱いを変える | ルーティング | 6-2-2 |
| 独立した部分を同時に処理する | 並列化 | 6-2-3 |
| 分け方が前もって決まらない仕事を配る | オーケストレーター | 6-2-4 |
| 何をするかが、やってみないと決まらない | エージェント | 6-3-1 |

ワークフローは、決まった仕事を予測しやすく、毎回同じように進めます。エージェントは、柔軟さとモデルによる判断が要るときに向きます。ただし、エージェントの仕組みは、速さと費用を性能と引き換えにします。まず単純な作りで試し(6-1-2)、Claude を 1 回呼ぶだけで足りるなら、エージェントにしません。

## もっと知りたい人へ

- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — MCP コネクターの機能と制限(英語)
- [Connect to external tools with MCP](https://code.claude.com/docs/en/agent-sdk/mcp) — Agent SDK での MCP のつなぎ方(英語)
- [Building effective agents](https://www.anthropic.com/research/building-effective-agents) — ワークフローとエージェントの使い分け(英語)

知識問題で、このレッスンの内容を確かめます。
