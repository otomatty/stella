---
sourceRefs: [SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-20261031, SRC-claude-docs-mcp-connector-usage-20261031, SRC-mcp-server-concepts-20261118, SRC-claude-agent-skills-20261118, SRC-claude-docs-tool-use-20261031, SRC-claude-developer-guide-v11-20261118]
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

MCP サーバーが提供できるものには、呼び出す操作（tool）、URI で読み取る資料（resource）、利用者が選ぶ指示のひな形（prompt）があります。例えば倉庫では、「在庫数を検索する」は tool、「商品分類表を読む」は resource、「棚卸し報告の下書きを始める」は prompt として提供できます。接続先の機能と、使うクライアントが対応する機能を両方確かめます。

### その仕事に MCP は必要か

| 倉庫チームの要望 | 最初に選ぶ手段と理由 |
| --- | --- |
| 調査のたびに同じ棚卸し手順と報告書の見本を参照したい | 手順・見本を Skill にまとめる。必要な仕事で再利用できる |
| エージェントの実行環境に置いた当日の在庫ファイルを読みたい | 既に利用できる組み込みのファイル読み取りツールを使う |
| 1 つのアプリから、社内の既存の引当関数を引数つきで呼びたい | クライアントツールとして定義し、アプリで権限と引数を検査して実行する |
| 複数の対応アプリで同じ在庫検索を使いたい。既に MCP サーバーがある | 各アプリからそのサーバーの検索ツールにつなぐ |

報告書の書き方を共有しても、現在の在庫数は分かりません。「報告の手順」と「在庫の取得」が両方必要なら、Skill と検索ツールを組み合わせます。

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

### 演習　デモで動いた倉庫検索をサービスに移す

倉庫の担当者は、自分の PC で動く stdio の MCP サーバーを Agent SDK から使っています。週末から、Web アプリの Messages API でも在庫を検索します。サービス用には外部から到達できる認証付き HTTPS の MCP サーバーを用意しました。二つのサーバーはどちらも `find_stock` と `reserve_stock` を提供します。

Web アプリの要件は「在庫を読むだけ。今後追加されるツールも個別に審査する」です。次の設定で満たせるか、設定を変える前に判定してください。

```js
const toolset = {
  type: "mcp_toolset",
  mcp_server_name: "warehouse",
  configs: { reserve_stock: { enabled: false } },
};
```

新しいツールを追加した日を想像すると、問題が分かります。この設定は既存の予約ツールだけを無効にします。次のように既定を無効にして、検索を一つずつ有効にします。

```js
const toolset = {
  type: "mcp_toolset",
  mcp_server_name: "warehouse",
  default_config: { enabled: false },
  configs: { find_stock: { enabled: true } },
};
```

この設定は `tools` に入れ、`mcp_servers` に同じ名前 `warehouse` と HTTPS の接続先を指定します。応答に `mcp_tool_result` があれば検索は実行済みです。手元のクライアントツール用の実行関数へ渡すと二重実行になります。

接続先が認証エラーを返したら、サービスが取得した有効なアクセストークンを接続設定の `authorization_token` に渡したかを確認します。検索ツールの入力にトークンを書いたり、接続を直すために予約ツールまで有効にしたりする必要はありません。

別の倉庫に、社外から接続できない stdio サーバーしかない場合はどうしますか。担当者の PC で Agent SDK から起動し、確認なしで使う名前を `mcp__warehouse__find_stock` に絞れます。Web アプリから直接接続するには、対応するリモートの接続先を別途用意します。

## もっと知りたい人へ

- [Connect to external tools with MCP(Agent SDK)](https://code.claude.com/docs/en/agent-sdk/mcp) — MCP の概要、サーバーの足し方、ツールの許可、つなぎ方(英語)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — Messages API からのつなぎ方と制限(英語)
- [Understanding MCP servers](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts) — Tools、resources、prompts の役割
- [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — 再利用する手順と資料の置き方

知識問題のあと、課題一覧から「MCP で品目表と在庫検索を提供する」を開きます。今度はサーバー側の関数を書き、資料の読み取り、品番検索、権限のない呼び出しの結果を手元のテストで確かめます。
