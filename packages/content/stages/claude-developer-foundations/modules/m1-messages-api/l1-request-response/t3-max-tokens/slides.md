---
sourceRefs: [SRC-claude-api-messages-create-20261031, SRC-claude-docs-stop-reasons-20261031]
id: 1-1-3
title: 出力の上限を決める
takeaway: "max_tokens は出力の上限で、届くと応答はそこで止まります。"
introduces: [max_tokens, トークン]
requires: [リクエスト, 応答]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 出力の上限を決める
<!-- ノート: 応答の長さの上限を決める項目を確かめます。 -->
---
# 要約が途中で終わる
長い議事録の要約が、文の途中で終わっていました。
<!-- ノート: 上限を小さく決めすぎたときに起きます。 -->
---
# max_tokens は上限
max_tokens は出力の上限で、届くと応答はそこで止まります。
<!-- ノート: トークンは、モデルが文章を数える単位です。 -->
---
# リクエストに書く
```js
const request = {
  max_tokens: 1024,
  messages: [{ role: "user", content: "議事録を要約して" }],
};
```
<!-- ノート: max_tokens はリクエストに必ず書く項目です。 -->
---
# 上限は目安ではない
- 上限より早く終わることはある
- 上限を超えて書き続けることはない
<!-- ノート: 公式ドキュメントは、上限より前に止まることもあると説明しています。 -->
---
<!-- _class: summary -->
# まとめ
max_tokens は出力の上限で、届くと応答はそこで止まります。
<!-- ノート: 上限で止まった応答の見分け方は、このあとのレッスンで扱います。 -->
