---
sourceRefs: [SRC-claude-sdk-hooks-20261118, SRC-claude-sdk-hook-callbacks-20261126]
id: 8-7-1
title: SDK でもフックで止める
takeaway: "Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。"
introduces: [ハーネス, matcher]
requires: [Agent SDK, query, PreToolUse, PostToolUse, Skill]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# SDK でもフックで止める
8-7-1
<!-- ノート: 帳票を確認するエージェントで、編集が始まる前に止める仕組みを作ります。 -->
---
# 閲覧するはずの帳票が変わった
監査用の帳票を確認するエージェントに、帳票を変更しないよう伝えました。それでも編集を試みました。
<!-- ノート: プロンプトには調べ方を書けます。帳票を守る条件は、どこで確かめればよいでしょうか。 -->
---
# 実行前に止める
Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。
<!-- ノート: ハーネスはエージェントを動かす側の仕組みです。SDK のフックなら、ハーネスがツールを呼ぶ前に拒否できます。 -->
---
# レビュー中の編集を拒否する
```ts
query({ prompt: "帳票を確認してください", options: { hooks: {
  PreToolUse: [{ matcher: "Write|Edit", hooks: [async () => ({
    hookSpecificOutput: {
      hookEventName: "PreToolUse", permissionDecision: "deny",
      permissionDecisionReason: "帳票の確認中は編集できません",
    },
  })] }],
} } });
```
<!-- ノート: matcher はイベントの対象を絞る条件です。この例では Write と Edit の呼び出しを実行前に止めます。 -->
---
# 記録を取るのは実行後
`PostToolUse` では、実行された操作を監査記録に残せます。
<!-- ノート: 実行後に記録が残っても、変更は発生済みです。編集を防ぐ条件は実行前に置きます。 -->
---
<!-- _class: summary -->
# まとめ
Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。
<!-- ノート: Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。 -->
