---
sourceRefs: [SRC-claude-docs-batch-20261031, SRC-claude-docs-batch-usage-20261031]
id: 2-3-1
title: 急がない大量の処理
takeaway: "急がない大量の処理は、Message Batches API にまとめて送ります。"
introduces: [Message Batches API, バッチ, custom_id]
requires: [リクエスト, Messages API]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 急がない大量の処理
<!-- ノート: 大量のリクエストの流し方を確かめます。 -->
---
# 1 件ずつ何千回も送る
問い合わせ 5,000 件の分類を、1 件ずつ順に送っていました。
<!-- ノート: 急ぎではないのに、通信と制限に時間を取られていました。 -->
---
# バッチにまとめる
急がない大量の処理は、Message Batches API にまとめて送ります。
<!-- ノート: バッチは、まとめて送って非同期に処理させるリクエストの束です。 -->
---
# リクエストの束
```js
const requests = tickets.map((ticket) => ({
  custom_id: `ticket-${ticket.id}`,
  params: { model, max_tokens: 256, messages: [{ role: "user", content: ticket.body }] },
}));
```
<!-- ノート: custom_id は、結果と元のリクエストを結ぶための ID で、束の中で重ならないようにします。 -->
---
# 向いている処理
- 大量の評価や分類
- まとめての要約や文章の作成
<!-- ノート: すぐに答えを返す必要のある画面の処理には向きません。 -->
---
<!-- _class: summary -->
# まとめ
急がない大量の処理は、Message Batches API にまとめて送ります。
<!-- ノート: 1 つのバッチには、10 万件か 256 MB までのリクエストを入れられます。 -->
