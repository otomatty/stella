---
sourceRefs: [SRC-claude-code-sdk-sessions-20261031, SRC-claude-code-agent-loop-control-20261031]
id: 6-3-3
title: 作業を再開する
takeaway: "続きの作業は、セッションの ID を控えておき、resume で再開します。"
introduces: [セッション, resume]
requires: [query, ResultMessage]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 作業を再開する
<!-- ノート: 前に動かしたエージェントの続きから始める方法です。 -->
---
# 最初からやり直し
分析を終えたエージェントに修正を頼んだら、同じファイルをまた全部読み直していました。
<!-- ノート: 新しく query を呼ぶと、前の会話を持たずに始まります。 -->
---
# ID を控えて再開
続きの作業は、セッションの ID を控えておき、resume で再開します。
<!-- ノート: セッションは、プロンプト・ツールの呼び出しと結果・応答を積み重ねた会話の履歴です。 -->
---
# resume を渡す
```js
for await (const message of query({
  prompt: "提案した修正を入れて", options: { resume: sessionId },
})) { /* … */ }
```
<!-- ノート: セッションの ID は、ResultMessage の session_id から控えます。失敗で終わったときにも入っています。 -->
---
# 3 つの戻り方
- continue: そのフォルダーの最新のセッション
- resume: ID で指したセッション
- fork: 写しを作って別の道を試す
<!-- ノート: セッションのファイルは、作ったマシンに保存されます。別のマシンで再開するには、保存先を共有します。 -->
---
<!-- _class: summary -->
# まとめ
続きの作業は、セッションの ID を控えておき、resume で再開します。
<!-- ノート: 回数の上限で止まった作業も、上限を上げて再開できます。 -->
