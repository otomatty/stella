---
sourceRefs: [SRC-claude-docs-streaming-deltas-20261031]
id: 2-2-3
title: まとめた応答を受け取る
takeaway: "イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。"
introduces: [finalMessage]
requires: [イベント, SDK]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# まとめた応答を受け取る
<!-- ノート: 途中の表示が要らないときの受け取り方を確かめます。 -->
---
# 表示は要らないのに
長い出力をファイルに保存するだけなのに、イベントを 1 つずつ組み立てていました。
<!-- ノート: 途中を表示しないなら、組み立てる処理は要りません。 -->
---
# SDK にまとめさせる
イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。
<!-- ノート: 中ではストリーミングで受け取り、SDK が応答の形に組み立てます。 -->
---
# finalMessage を待つ
```js
const stream = client.messages.stream(request);
const message = await stream.finalMessage();
```
<!-- ノート: message は、messages.create の応答と同じ形です。 -->
---
# 使い分け
- 届いた順に見せたい: イベントや text を使う
- 結果だけが要る: finalMessage を使う
<!-- ノート: max_tokens の大きいリクエストでは、SDK がストリーミングを求めることがあります。 -->
---
<!-- _class: summary -->
# まとめ
イベントを1つずつ扱わなくても、SDK で最後にまとめた応答を受け取れます。
<!-- ノート: 急がない大量の処理には、別の方法があります。 -->
