---
sourceRefs: [SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-use-20261031]
id: 5-1-2
title: 結果を返す
takeaway: "ツールの結果は tool_result にして、次のリクエストの user の発言で返します。"
introduces: [tool_result, tool_use_id, ツール使用のループ]
requires: [tool_use, 会話の履歴, end_turn]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 結果を返す
<!-- ノート: 実行したツールの結果を、Claude に渡す方法です。 -->
---
# 結果の渡し方が分からない
在庫を調べられましたが、その数を Claude に渡す方法が分からず、答えを作れませんでした。
<!-- ノート: 結果は、会話の続きとして送ります。 -->
---
# tool_result で返す
ツールの結果は tool_result にして、次のリクエストの user の発言で返します。
<!-- ノート: tool_use_id に、呼び出しの tool_use ブロックの id を書いて結びます。 -->
---
# 会話に足す
```js
messages.push({ role: "assistant", content: message.content });
messages.push({ role: "user", content: [
  { type: "tool_result", tool_use_id: block.id, content: "12" },
] });
```
<!-- ノート: 応答の content はそのまま足し、すぐあとに結果を置きます。結果のブロックは content の先頭に並べます。 -->
---
# 終わるまで繰り返す
stop_reason が tool_use の間は、実行と返す処理を繰り返します。end_turn になったら答えです。
<!-- ノート: これをツール使用のループと呼びます。1 つの応答に複数の呼び出しがあれば、結果をまとめて 1 つの発言で返します。 -->
---
<!-- _class: summary -->
# まとめ
ツールの結果は tool_result にして、次のリクエストの user の発言で返します。
<!-- ノート: SDK には、このループを代わりに回すツールランナーもあります。 -->
