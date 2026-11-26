---
sourceRefs: [SRC-claude-docs-handle-tool-calls-20261031, SRC-claude-docs-tool-result-troubleshooting-20261126, SRC-claude-docs-parallel-tool-use-20261126, SRC-claude-docs-manage-tool-context-20261126]
id: 6-6-1
title: トレースで原因を探す
takeaway: "エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。"
introduces: [トレース]
requires: [tool_use, tool_result, stop_reason, コンテキスト]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# トレースで原因を探す
<!-- ノート: トレース（処理が起きた順の記録）で、期待した動きが崩れた場所を探します。 -->
---
# 照会ツールは両方成功した
在庫と価格の照会はどちらも成功しました。その直後の API リクエストに 400 が返ります。
<!-- ノート: ツールの実行結果に加えて、次のリクエストに何を入れたかを見ます。 -->
---
# 最初に崩れた箇所を探す
エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。
<!-- ノート: 呼び出し ID と結果の並びを見て、どの受け渡しが欠けているかを確かめます。 -->
---
# 照会の行き来を順に読む
| 時点 | 記録 |
| --- | --- |
| assistant | `tool_use(a)`、`tool_use(b)` |
| user | `tool_result(a)` |
| API | 400、`b` の結果がない |
<!-- ノート: 呼び出し b の結果もできています。a と b の結果を直後の同じ user の発言に並べます。 -->
---
<!-- _class: summary -->
# まとめ
エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。
<!-- ノート: エージェントの不具合は、実行の記録を順に読み、どの設計が欠けているかで分けます。 -->
