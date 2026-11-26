---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-stop-reasons-20261031]
id: 2-2-4
title: 応答の終わりを見分ける
takeaway: "content_block_stop はブロックの終わりで、応答の終わりは message_stop です。"
introduces: [content_block_stop, message_stop]
requires: [イベント, コンテンツブロック, message_delta, stop_reason, max_tokens]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 応答の終わりを見分ける
<!-- ノート: 設備点検の報告を、届いた順に画面へ表示します。 -->
---
# 報告の末尾が欠けても「完了」になる
画面は最初のブロックが閉じた時点で「完了」にします。後続のイベントは読んでいません。
<!-- ノート: 短い報告では気づきにくく、長い報告で点検項目が欠けました。 -->
---
# 応答の終わりまで読む
content_block_stop はブロックの終わりで、応答の終わりは message_stop です。
<!-- ノート: 途中のブロックが閉じても、次のブロックや終了理由が続くことがあります。 -->
---
# 止まった理由を画面に反映する
| 受信したイベント | 画面の処理 |
| --- | --- |
| `content_block_stop` | 受信を続ける |
| `message_delta` | `delta.stop_reason` を控える |
| `message_stop` | 控えた理由で確定できるか決める |
<!-- ノート: 理由が max_tokens なら、応答の終わりまで届いていても「上限で中断」と表示します。 -->
---
# 短い報告と長い報告で確かめる
通常終了は「完了」、出力の上限に届いたら「上限で中断」と表示します。
<!-- ノート: 上限を増やしても、画面が最初のブロックで確定する処理は残ります。 -->
---
<!-- _class: summary -->
# まとめ
content_block_stop はブロックの終わりで、応答の終わりは message_stop です。
<!-- ノート: content_block_stop はブロックの終わりで、応答の終わりは message_stop です。 -->
