---
sourceRefs: [SRC-claude-docs-structured-outputs-20261031, SRC-claude-docs-structured-considerations-20261031]
id: 4-2-1
title: 決まった形の JSON
takeaway: "決まった形の JSON が要るときは、構造化出力でスキーマを渡します。"
introduces: [構造化出力, JSON スキーマ]
requires: [output_config, コンテンツブロック, 指示]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 決まった形の JSON
<!-- ノート: アプリで読む JSON を、確実に決まった形で受け取る方法です。 -->
---
# ときどき壊れる JSON
「JSON で答えて」と頼んでいました。ときどき項目が欠けたり、JSON として読めなかったりしました。
<!-- ノート: 指示だけでは、形が保証されません。 -->
---
# スキーマを渡す
決まった形の JSON が要るときは、構造化出力でスキーマを渡します。
<!-- ノート: JSON スキーマは、JSON の項目・型・必須の項目を決める書き方です。応答はスキーマどおりの JSON になります。 -->
---
# output_config.format に書く
```js
output_config: {
  format: { type: "json_schema", schema },
},
```
<!-- ノート: JSON は、応答の text ブロックに入って返ります。 -->
---
# スキーマの決まり
- オブジェクトには additionalProperties: false を書く
- 数の範囲や文字数の制限は書けない(400 エラー)
<!-- ノート: 書けない制限は、受け取ったあとアプリで確かめます。SDK の補助には、制限を説明に移して受け取ったあとに確かめるものがあります。 -->
---
<!-- _class: summary -->
# まとめ
決まった形の JSON が要るときは、構造化出力でスキーマを渡します。
<!-- ノート: スキーマを渡しても、読む前に確かめることがあります。 -->
