---
sourceRefs: [SRC-claude-docs-messages-system-20261031, SRC-claude-api-messages-create-20261031]
id: 1-1-2
title: 前提は system に書く
takeaway: "最初から効かせる役割や前提は、messages ではなく system に書きます。"
introduces: [system]
requires: [messages, リクエスト]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 前提は system に書く
<!-- ノート: 役割や前提をどこに書くかを確かめます。 -->
---
# 指示が発言に混ざる
役割の指示を、利用者の発言の先頭に毎回つないでいます。
どこまでが指示か、読みにくくなります。
<!-- ノート: 発言と指示が混ざると、履歴を組み立てる処理も複雑になります。 -->
---
# system に書く
最初から効かせる役割や前提は、messages ではなく system に書きます。
<!-- ノート: system は、目的や役割などの前提を Claude に渡すための項目です。 -->
---
# system と messages
```js
const request = {
  system: "あなたは社内ヘルプデスクの担当者です",
  messages: [{ role: "user", content: "VPN につながりません" }],
};
```
<!-- ノート: system はリクエストの一番上の階層の項目で、messages の外に置きます。 -->
---
# 発言と分ける
- system は、役割・前提・守ること
- messages は、利用者と Claude のやり取り
<!-- ノート: 会話の途中で指示を足す方法もありますが、最初から効かせる指示は system に書きます。 -->
---
<!-- _class: summary -->
# まとめ
最初から効かせる役割や前提は、messages ではなく system に書きます。
<!-- ノート: system に何を書くと効くかは、プロンプトの単元で扱います。 -->
