---
sourceRefs: [SRC-claude-code-hooks-guide-20261031, SRC-claude-code-memory-20261031]
id: 8-1-2
title: 必ず実行する処理
takeaway: "必ず実行したい処理は、CLAUDE.md の指示ではなくフックで決めます。"
introduces: [フック, PreToolUse, PostToolUse]
requires: [CLAUDE.md]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 必ず実行する処理
<!-- ノート: 指示に頼らず、決まった時点で必ず動く処理の作り方です。 -->
---
# 書いたのに守られない
CLAUDE.md に「.env は書き換えない」と書いていました。ある日、.env が書き換えられていました。
<!-- ノート: CLAUDE.md は指示として読まれるだけで、必ず守られるとは限りません。 -->
---
# フックで決める
必ず実行したい処理は、CLAUDE.md の指示ではなくフックで決めます。
<!-- ノート: フックは、Claude Code が決まった時点で必ず動かす、自分で書いたコマンドです。 -->
---
# よく使う時点
- PreToolUse: ツールを使う前。止められる
- PostToolUse: ツールを使ったあと。整形などに使う
<!-- ノート: PreToolUse のフックが終了コード 2 で終わると、その呼び出しは止まり、理由が Claude に伝わります。 -->
---
<!-- _class: summary -->
# まとめ
必ず実行したい処理は、CLAUDE.md の指示ではなくフックで決めます。
<!-- ノート: フックは設定ファイルに書きます。どの設定ファイルに書くかで、効く範囲が変わります。 -->
