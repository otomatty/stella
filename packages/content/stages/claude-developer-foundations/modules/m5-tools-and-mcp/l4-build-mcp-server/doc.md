---
sourceRefs: [SRC-mcp-architecture-20261126, SRC-mcp-server-concepts-20261118, SRC-mcp-tools-spec-20260728, SRC-mcp-resources-spec-20260728, SRC-mcp-prompts-20261126, SRC-claude-code-mcp-20261126, SRC-mcp-stdio-20261126, SRC-mcp-streamable-http-20261126, SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-usage-20261031, SRC-mcp-authorization-20261126, SRC-claude-sdk-mcp-oauth-20261126, SRC-mcp-stateless-20261126]
---
# レッスン5-4 MCP サーバーを作ってつなぐ

## このレッスンの目標

- [ ] 誰が使い始めるかを見て、ツール・リソース・プロンプトを選べます。
- [ ] サーバーの動かし方に合わせて、stdio と Streamable HTTP を選べます。
- [ ] HTTP でトークンを受け取り、あて先を確かめる場所を説明できます。

## 5-4-1 サーバーが出す 3 つ

> **MCP サーバーは、ツール・リソース・プロンプトの 3 つを出します。**

会議室の予約アプリを例に、サーバーで何を提供するかを決めます。利用者が操作するアプリがホストです。ホストは接続先ごとに MCP クライアントを 1 つ持ちます。クライアントとサーバーは、メソッド名と引数を含む JSON-RPC 2.0 のメッセージでやり取りします。

| 提供するもの | 誰が使い始めるか | 会議室での設計 |
| --- | --- | --- |
| ツール | モデルが呼ぶかを決めます | 空き検索を `tools/list` に載せ、`tools/call` で検索します |
| リソース | ホストのアプリが読むかを決めます | 利用規則を `rooms://guide/reservations` のような URI（資料を指す識別子）で示し、必要なときに `resources/read` で読みます |
| プロンプト | 利用者がひな形を選びます | 受付の人が案内文のひな形を選んだとき、`prompts/get` で取得します |

提供する種類は用途に合わせて選びます。Claude Code の対話画面では、利用者が `@rooms:rooms://guide/reservations` と入力して資料を参照でき、`/mcp__rooms__reservation_note` で案内文のひな形を開けます。

サーバーを書くときは、失敗の返し先も決めます。たとえば空き検索のツールに営業時間外の時刻が渡ったら、ツールの結果に `isError: true` を付け、受け付ける時間帯を知らせます。モデルはその結果を読んで入力を直せます。一方、サーバーが実装していないメソッドへのリクエストには JSON-RPC のエラーを返します。5-1-3 の `is_error` は、Messages API に結果を渡すときの項目名です。

## 5-4-2 つなぎ方を選ぶ

> **手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。**

つなぎ方をトランスポートと呼びます。会議室の試作を手元で動かすときと、複数部署へ配るときでは、サーバーを起動する人とメッセージの経路が変わります。

| つなぎ方 | 起動と送受信 | 実装時に確かめること |
| --- | --- | --- |
| stdio | クライアントが子プロセスとして起動し、標準入出力で改行区切りのメッセージを送受信します | 標準出力は MCP のメッセージ専用にします。ログは標準エラーに出し、サービス接続の認証情報は環境変数から渡します |
| Streamable HTTP | 共有サーバーが 1 つの入口で POST を受け、リクエストに JSON または SSE のストリームで応答します | `Origin` ヘッダーを検査します。手元で試す HTTP サーバーは localhost にだけ開きます |

SSE は、HTTP の応答を開いたままサーバーからイベントを順に届ける方式です。古い HTTP+SSE トランスポートは非推奨です。新しく HTTP サーバーを作るなら Streamable HTTP を選びます。

サーバーを用意したら、Claude Code には使う方のコマンドで登録します。下の例は同じ名前での別々の登録例です。

```bash
claude mcp add --transport stdio rooms -- node ./rooms.mjs
claude mcp add --transport http rooms https://rooms.example.com/mcp
```

| 登録の範囲 | 使える場所 |
| --- | --- |
| ローカル（既定） | いまのプロジェクトで自分だけが使います |
| プロジェクト（`--scope project`） | リポジトリの `.mcp.json` に置き、チームで共有します。接続する人の承認が要ります |
| ユーザー（`--scope user`） | 自分の複数のプロジェクトから使います |

Agent SDK なら、5-3-3 の `mcpServers` に stdio の `command`・`args`・`env`、または HTTP の `type: "http"` と `url` を指定します。ツール名と許可の書き方は 5-3-3 と共通です。5-3-2 の Messages API の MCP コネクターで使えるのは、API から届く公開 HTTP サーバーのツールです。手元の stdio や、HTTP サーバーのリソース・プロンプトが必要なときは、それらに対応したクライアントを選びます。

## 5-4-3 離れたサーバーを守る

> **HTTP の MCP サーバーは、トークンをヘッダーで受け取り、自分あてのものかを確かめます。**

会議室の検索を社員に限るときは、HTTP の入口で認可を行います。認可は、呼び出し元に操作を許してよいかを確かめることです。MCP の認可は HTTP に適用できる任意の機能で、OAuth 2.1 に基づきます。MCP サーバーはリソースサーバーとして、認可サーバーの情報を含む保護されたリソースのメタデータを公開します。保護した入口へのリクエストに認証情報がなければ、`401` と `WWW-Authenticate` でトークンの取得に必要な情報を知らせます。

| 確かめるところ | サーバーとアプリで行うこと |
| --- | --- |
| 渡し方 | クライアントは `Authorization: Bearer <トークン>` を送ります。URL の問い合わせ文字列に入れるとアクセスログなどに残るため、ヘッダーを使います |
| あて先（audience） | サーバーはトークンの有効性に加え、自分あてに発行されたことを検査します。同じ発行元でも備品管理サービス用のトークンは拒否します |
| 別サービスへのアクセス | MCP サーバーが別のサービスも呼ぶなら、そのサービス用に発行された認証情報を使います |

Agent SDK は対話での OAuth を行いません。アプリが取得したトークンを HTTP サーバー設定の `headers` に渡します。

## もっと知りたい人へ

- [MCP の構成と担当](https://modelcontextprotocol.io/specification/2026-07-28/architecture) — ホストが接続ごとにクライアントを持つ仕組み（英語）
- [手元での送受信](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio) と [HTTP での送受信](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) — 通信とログの経路（英語）
- [接続を登録して使う手順](https://code.claude.com/docs/en/mcp) — 登録範囲、リソースの参照、プロンプトの選び方（英語）
- [HTTP の認可の手順](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) — トークンの取得と検査（英語）
- [通信の版による違い](https://modelcontextprotocol.io/specification/2026-07-28/changelog) — 2025-11-25 までの版は接続時に初期化して機能を伝え合います。2026-07-28 版は通信の状態を各リクエストの間で持たず、初期化の手順を廃止しています（英語）。

知識問題で、使い始める人・つなぐ場所・トークンのあて先から、サーバーの実装を選びます。
