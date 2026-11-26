---
sourceRefs: [SRC-claude-code-extensions-20261118, SRC-claude-code-memory-load-20261126, SRC-claude-code-memory-rules-20261126, SRC-claude-code-best-practices-extension-20261126, SRC-claude-code-hooks-guide-20261031, SRC-claude-code-hook-types-20261126]
id: 8-5-2
title: 仕組みを選ぶ
takeaway: "常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。"
introduces: []
requires: [CLAUDE.md, ルールファイル, Skill, フック, PreToolUse, PostToolUse, サブエージェント, MCP サーバー]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 仕組みを選ぶ
<!-- ノート: チームの希望を読み、どこに約束や処理を置くか決めます。 -->
---
# チームの希望が三つある
どの作業でも日付の書式をそろえたいです。報告の手順は頼んだときに使い、承認済みの原本は編集を実行する前に守りたいです。
<!-- ノート: 三つともチームの希望ですが、必要なタイミングと強さが違います。 -->
---
# いつ、何を効かせるか
常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。
<!-- ノート: どの作業に効かせるか、手順をいつ読むか、モデルの判断に任せられるかを考えます。 -->
---
# 希望に合わせて置き場所を選ぶ

| 希望 | 選ぶもの |
| --- | --- |
| 日付の書式を毎回伝える | CLAUDE.md |
| 在庫レポートの手順を使い回す | Skill |
| 原本への編集を実行前に止める | コマンド型の PreToolUse フック |

<!-- ノート: 書式の指示は毎回読みます。報告の手順は必要なときだけ読みます。原本の編集は、実行前に決まった条件で止めます。 -->
---
# 止めるなら実行の前
`PostToolUse` が動く時点では、ツールは実行済みです。実行前に止める条件は、コマンド型の `PreToolUse` で判定します。
<!-- ノート: プロンプト型やエージェント型のフックは、判定にモデルを使います。固定の条件で止めるなら、その条件をコマンドに書きます。 -->
---
<!-- _class: summary -->
# まとめ
常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。
<!-- ノート: 常に効かせるなら CLAUDE.md、繰り返すなら Skill、必ず実行するならフックを選びます。 -->
