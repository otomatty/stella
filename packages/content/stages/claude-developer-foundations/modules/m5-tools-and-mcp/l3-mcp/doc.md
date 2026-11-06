---
sourceRefs: [SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031]
---
# レッスン5-3 MCP でつなぐ

## このレッスンの目標

- [ ] MCP と MCP サーバーの役割を説明できます。
- [ ] Messages API から MCP コネクターで MCP サーバーのツールを使う書き方を説明できます。
- [ ] Agent SDK で MCP サーバーを足し、ツールを許可する書き方を説明できます。

## 5-3-1 共通の約束でつなぐ

> **MCP は、ツールやデータを AI のアプリにつなぐための、公開された共通の規格です。**

MCP(Model Context Protocol)は、AI のエージェントを外のツールやデータにつなぐための、公開された共通の規格です。ツールやデータを提供する側を MCP サーバー、MCP サーバーとやり取りする側を MCP クライアントと呼びます。MCP を使うと、データベースの検索や、Slack・GitHub のようなサービスとの連携を、ツールを 1 つずつ自分で作らずに使えます。

アプリごとにツールを作り直す代わりに、MCP サーバーとして一度用意すれば、MCP に対応したアプリから同じサーバーを使えます。MCP サーバーは、手元のプロセスとしても、ネット越しの HTTP としても、アプリの中でも動かせます。

Claude の側では、次の 2 つから MCP サーバーを使えます。

| 使う場所 | 方法 | このレッスン |
| --- | --- | --- |
| Messages API | MCP コネクター | 5-3-2 |
| Agent SDK(と Claude Code) | MCP サーバーの設定 | 5-3-3 |

MCP の仕様は modelcontextprotocol.io で公開されています。この教材は、Anthropic と Claude Code の公式ドキュメントに書かれた範囲で扱います。

## 5-3-2 API から MCP を使う

> **MCP コネクターを使うと、Messages API からリモートの MCP サーバーのツールを使えます。**

MCP コネクターは、Messages API のリクエストに MCP サーバーを書くだけで、そのサーバーのツールを使えるようにする機能です。自分で MCP クライアントを作る必要はありません。いまはベータの機能で、ベータのヘッダーを付けて使います。

```js
const message = await client.beta.messages.create({
  model,
  max_tokens: 1024,
  messages,
  mcp_servers: [
    { type: "url", url: "https://mcp.example.com/sse", name: "tickets", authorization_token: token },
  ],
  tools: [{ type: "mcp_toolset", mcp_server_name: "tickets" }],
  betas: ["mcp-client-2025-11-20"],
});
```

| 書く場所 | 中身 |
| --- | --- |
| `mcp_servers` | つなぐ先。`type` は `"url"`、`url` は `https://` で始まる。`name` はサーバーを区別する名前。認証が要るなら `authorization_token` |
| `tools` の `mcp_toolset` | `mcp_server_name` で `mcp_servers` の `name` を指し、そのサーバーのツールを使えるようにする。`default_config` と `configs` で、使うツールの許可の一覧や外す一覧を書ける |

Claude が MCP のツールを使うと、応答に `mcp_tool_use` と `mcp_tool_result` のブロックが入ります。ツールの実行と結果の受け渡しは API の側で行われるので、アプリが `tool_result` を返す必要はありません。

いまの MCP コネクターには、次の制限があります。

- MCP の機能のうち、使えるのはツールの呼び出しだけです。
- MCP サーバーは、HTTP(Streamable HTTP か SSE)で公開されている必要があります。手元のプロセス(stdio)の MCP サーバーは、直接つなげません。

## 5-3-3 SDK から MCP を使う

> **Agent SDK では、MCP サーバーを設定に足し、使うツールを allowedTools で許可します。**

Agent SDK では、`query()` の `mcpServers` の設定か、プロジェクトの `.mcp.json` のファイルに MCP サーバーを書きます。つなぎ方は、サーバーの説明に合わせて選びます。

| サーバーの説明にあるもの | つなぎ方 |
| --- | --- |
| 実行するコマンド(`npx …` など) | stdio(手元のプロセス) |
| URL | HTTP か SSE |
| (自分のアプリの中にツールを書く) | SDK の MCP サーバー |

MCP のツールは、許可するまで Claude が呼べません。ツールの名前は `mcp__<サーバー名>__<ツール名>` で、`mcpServers` に書いたキーがサーバー名になります(`github` なら `mcp__github__list_issues`)。`allowedTools` にこの名前を書くと、確認なしで使えるようになります。`mcp__github__*` のように `*` を使うと、そのサーバーのツールをまとめて許可できます。トークンのような秘密は、コードに書かず環境変数から渡します。

```js
for await (const message of query({
  prompt: "anthropics/claude-code の新しい課題を 3 件挙げて",
  options: {
    mcpServers: {
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      },
    },
    allowedTools: ["mcp__github__list_issues"],
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

MCP のツールを使えるようにするために、確認をすべて飛ばす設定(`permissionMode: "bypassPermissions"`)にはしません。ほかの安全のための確認まで外れてしまいます。`allowedTools` で、要るサーバーのツールだけを許可します。

## もっと知りたい人へ

- [Connect to external tools with MCP(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/mcp) — MCP の概要、サーバーの足し方、ツールの許可、つなぎ方(英語)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — Messages API からのつなぎ方と制限(英語)

知識問題で、このレッスンの内容を確かめます。
