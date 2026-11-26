---
sourceRefs: [SRC-claude-docs-server-tools-20261126, SRC-claude-docs-stop-reasons-20261031]
id: 6-6-3
title: 途中で返ってきた応答
takeaway: "stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。"
introduces: [pause_turn]
requires: [stop_reason, サーバーツール, messages, content, tools]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 途中で返ってきた応答
<!-- ノート: サーバー側の処理が一時停止したときの、続きの受け取り方を見ます。 -->
---
# 検索の途中で完了と表示された
規程を検索するアプリが、結論のない応答を受け取りました。停止理由は `pause_turn` です。
<!-- ノート: サーバーツールの繰り返しが上限に届くと、処理の途中で応答が返ります。 -->
---
# 途中の応答をそのまま渡す
stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。
<!-- ノート: 続きのリクエストでは、元の会話に応答の content を assistant の発言として足します。 -->
---
# 同じツールで続きを受け取る
応答に入っていた呼び出しも残し、同じ `tools` で送ります。新しい user の発言は足しません。
<!-- ノート: また pause_turn が来れば、同じ手順で続きを送れます。続行にも上限を付け、上限に達したことを記録します。 -->
---
<!-- _class: summary -->
# まとめ
stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。
<!-- ノート: stop_reason が pause_turn の応答は、内容を変えずに送り直して続きを受け取ります。 -->
