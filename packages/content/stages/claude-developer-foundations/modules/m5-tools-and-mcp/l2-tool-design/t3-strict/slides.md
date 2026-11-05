---
sourceRefs: [SRC-claude-docs-strict-tool-use-20261031, SRC-claude-docs-structured-considerations-20261031]
id: 5-2-3
title: ツールの入力を守らせる
takeaway: "ツールの入力をスキーマどおりにさせるには、strict: true を指定します。"
introduces: [strict]
requires: [input_schema, tool_use, JSON スキーマ]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# ツールの入力を守らせる
<!-- ノート: ツールに渡る入力の形を、確実にする方法です。 -->
---
# 文字の "2"
人数を数で受け取るツールに、ときどき "2" や "two" が渡り、予約の処理が例外で止まりました。
<!-- ノート: スキーマを書いていても、それだけでは型が保証されません。 -->
---
# strict を指定する
ツールの入力をスキーマどおりにさせるには、strict: true を指定します。
<!-- ノート: tool_use ブロックの input が、必ず input_schema どおりになります。必須の項目も欠けません。 -->
---
# ツールの定義に足す
```js
{ name: "book_room", description, strict: true,
  input_schema: { ...schema, additionalProperties: false } }
```
<!-- ノート: スキーマの決まりは、構造化出力と同じです。数の範囲や文字数の制限は書けません。 -->
---
<!-- _class: summary -->
# まとめ
ツールの入力をスキーマどおりにさせるには、strict: true を指定します。
<!-- ノート: 構造化出力は答えの形、strict はツールの入力の形を守らせます。両方を一緒に使えます。 -->
