---
sourceRefs: [SRC-claude-docs-tool-use-20261031, SRC-claude-docs-define-tools-20261031, SRC-claude-docs-handle-tool-calls-20261031]
id: 5-1-1
title: ツールを実行するのはアプリ
takeaway: "自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。"
introduces: [ツール, tools, input_schema, tool_use]
requires: [ツール使用, stop_reason, リクエスト, JSON スキーマ]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# ツールを実行するのはアプリ
<!-- ノート: Claude に、自分のアプリの機能を使わせる仕組みです。 -->
---
# 在庫を答えられない
「この商品の在庫は？」と聞かれても、Claude は自社の在庫のデータを知りません。
<!-- ノート: Claude が知らない情報や、Claude にはできない操作があります。 -->
---
# 求めるのは Claude、実行はアプリ
自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。
<!-- ノート: ツールは、アプリが Claude に使わせる関数です。Claude は自分では実行しません。 -->
---
# tools に定義する
```js
tools: [{
  name: "get_stock",
  description: "商品の在庫数を調べる",
  input_schema: { type: "object", properties: { sku: { type: "string" } } },
}],
```
<!-- ノート: input_schema は、ツールに渡す入力の JSON スキーマです。 -->
---
# 呼び出しを求める応答
- stop_reason: "tool_use"
- tool_use ブロック: id・name・input
<!-- ノート: アプリは name に合う関数を、input を渡して実行します。 -->
---
<!-- _class: summary -->
# まとめ
自分で定義したツールは、Claude が呼び出しを求め、アプリが実行します。
<!-- ノート: 実行した結果は、Claude に返します。 -->
