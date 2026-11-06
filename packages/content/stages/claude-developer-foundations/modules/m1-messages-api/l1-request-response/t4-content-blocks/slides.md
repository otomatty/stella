---
sourceRefs: [SRC-claude-api-messages-create-20261031, SRC-claude-docs-messages-20261031]
id: 1-1-4
title: 応答はブロックの配列
takeaway: "応答の content は、type で形の決まるブロックの配列です。"
introduces: [content, コンテンツブロック, type]
requires: [応答]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 応答はブロックの配列
<!-- ノート: 応答から本文を取り出す方法を確かめます。 -->
---
# 本文が取れない
応答の content を、そのまま文字として表示しようとしました。
画面には、オブジェクトが並んで出ました。
<!-- ノート: content を文字だと思い込んだ失敗です。 -->
---
# content はブロックの配列
応答の content は、type で形の決まるブロックの配列です。
<!-- ノート: ブロックは content の 1 つ 1 つの要素で、コンテンツブロックと呼びます。 -->
---
# テキストを取り出す
```js
const text = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");
```
<!-- ノート: type が text のブロックだけを選び、text をつなぎます。 -->
---
# 先頭だけを見ない
- テキストのブロックが 2 つ以上来ることがある
- テキスト以外のブロックが先に来ることがある
<!-- ノート: content[0].text だけを読むと、このどちらでも本文を取りこぼします。 -->
---
<!-- _class: summary -->
# まとめ
応答の content は、type で形の決まるブロックの配列です。
<!-- ノート: テキスト以外のブロックは、ツール使用の単元で扱います。 -->
