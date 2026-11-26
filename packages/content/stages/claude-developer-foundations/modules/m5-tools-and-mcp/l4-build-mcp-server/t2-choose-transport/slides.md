---
sourceRefs: [SRC-mcp-stdio-20261126, SRC-mcp-streamable-http-20261126, SRC-claude-code-mcp-20261126, SRC-claude-code-sdk-mcp-20261031, SRC-claude-docs-mcp-connector-usage-20261031]
id: 5-4-2
title: つなぎ方を選ぶ
takeaway: "手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。"
introduces: [stdio, Streamable HTTP]
requires: [MCP クライアント, MCP コネクター]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# つなぎ方を選ぶ
<!-- ノート: 会議室の MCP サーバーを、まず開発端末で試します。 -->
---
# 手元の試作を受付にも配る
手元では Claude Code から試せています。受付の端末からも同じサーバーを使いたいとき、どこでサーバーを動かしますか？
<!-- ノート: 登録先のアプリと、サーバーを動かす場所を考えます。 -->
---
# つなぐ場所で決める
手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。
<!-- ノート: stdio ではクライアントがサーバーを子プロセスとして起動します。共有するならサーバーを別に動かし、各アプリが同じ HTTP の入口に接続します。 -->
---
# 同じ機能を別のつなぎ方で登録する
```bash
claude mcp add --transport stdio rooms -- node ./rooms.mjs
claude mcp add --transport http rooms https://rooms.example.com/mcp
```
<!-- ノート: 2 行はそれぞれ別の登録例です。HTTP で新しく作るなら Streamable HTTP を選びます。 -->
---
# stdio のログは標準エラーへ
標準出力には、改行で区切った MCP のメッセージだけを出します。起動時のログは標準エラーへ出します。
<!-- ノート: 標準出力のログは、相手が MCP のメッセージとして読もうとします。起動はできても接続に失敗する原因になります。 -->
---
<!-- _class: summary -->
# まとめ
手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。
<!-- ノート: 手元の 1 つのアプリ向けなら stdio、離れた場所から複数で使うなら HTTP でつなぎます。 -->
