---
sourceRefs: [SRC-claude-docs-context-windows-20261031, SRC-claude-docs-context-overflow-20261031]
id: 4-3-1
title: 枠に収める
takeaway: "入力と出力は、合わせてコンテキストウィンドウに収めます。"
introduces: [コンテキストウィンドウ, model_context_window_exceeded]
requires: [system, messages, max_tokens, stop_reason]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 枠に収める
<!-- ノート: 1 回のリクエストで扱える量の上限を確かめます。 -->
---
# 会話が続くと
長く続いた会話に、さらに資料を足して送りました。「prompt is too long」のエラーが返りました。
<!-- ノート: 会話の履歴が積み重なり、上限を超えていました。 -->
---
# 合わせて枠に収める
入力と出力は、合わせてコンテキストウィンドウに収めます。
<!-- ノート: コンテキストウィンドウは、応答を作るときに Claude が参照できるトークンの全体で、作る出力も含みます。 -->
---
# 枠に数えるもの
- system と messages(ツールの結果・画像・文書を含む)
- ツールの定義
- その回に作る出力(考える過程を含む)
<!-- ノート: キャッシュした前半も枠に数えます。キャッシュで変わるのは料金で、枠の使い方は変わりません。 -->
---
# 超えたとき
- 入力だけで超える: 400 エラー(prompt is too long)
- 出力の途中で超える: model_context_window_exceeded で止まる
<!-- ノート: 送る前にトークン数を数えると、超えるかどうかを確かめられます。 -->
---
<!-- _class: summary -->
# まとめ
入力と出力は、合わせてコンテキストウィンドウに収めます。
<!-- ノート: 枠に収まっていても、入れすぎには別の問題があります。 -->
