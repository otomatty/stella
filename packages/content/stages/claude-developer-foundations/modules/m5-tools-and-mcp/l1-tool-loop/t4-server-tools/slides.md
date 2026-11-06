---
sourceRefs: [SRC-claude-docs-tool-use-20261031, SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-errors-20261031]
id: 5-1-4
title: Anthropic 側で動くツール
takeaway: "サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。"
introduces: [サーバーツール, クライアントツール]
requires: [ツール, tool_result]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# Anthropic 側で動くツール
<!-- ノート: 実行する場所で、ツールを 2 つに分けます。 -->
---
# 検索を自分で作る？
最新の情報を調べさせたくて、ウェブ検索のツールを自分で作ろうとしていました。
<!-- ノート: よく使う機能には、Anthropic が用意したツールがあります。 -->
---
# サーバーツール
サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。
<!-- ノート: 結果は、応答の中にそのまま入って返ります。 -->
---
# 2 つの分け方
- クライアントツール: アプリが実行する(自分で定義したもの、bash など)
- サーバーツール: Anthropic が実行する(ウェブ検索、コードの実行など)
<!-- ノート: bash やテキストエディターは、形を Anthropic が決めていますが、実行するのはアプリです。 -->
---
<!-- _class: summary -->
# まとめ
サーバーツールは Anthropic の側で実行され、アプリが結果を返す処理は要りません。
<!-- ノート: サーバーツールのエラーも Claude が扱うので、is_error を返す必要はありません。 -->
