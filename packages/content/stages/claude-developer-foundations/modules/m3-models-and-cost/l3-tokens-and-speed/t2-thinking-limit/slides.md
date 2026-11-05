---
sourceRefs: [SRC-claude-docs-thinking-20261031, SRC-claude-docs-effort-set-20261031]
id: 3-3-2
title: 考える過程も出力に数える
takeaway: "考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。"
introduces: [考える過程, thinking ブロック]
requires: [effort, max_tokens, コンテンツブロック, 途中で切れた応答]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 考える過程も出力に数える
<!-- ノート: 答える前に考える過程が、出力のトークンにどう効くかを確かめます。 -->
---
# 答えが途中で切れる
effort を high に上げたら、答えが途中で切れるようになりました。max_tokens は前と同じでした。
<!-- ノート: 考える量が増えた分、答えに回るトークンが足りなくなりました。 -->
---
# 上限は max_tokens
考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。
<!-- ノート: 最近のモデルは、答える前に考える過程を既定で使い、考えるかどうかと深さを自分で決めます。 -->
---
# 応答の並び
- thinking ブロック: 考えた過程(既定では中身が空のことがある)
- text ブロック: 答え
<!-- ノート: 中身を表示しない設定でも、考えた分のトークンは同じように課金されます。 -->
---
# effort と max_tokens
- effort: どれだけ考えるかの目安
- max_tokens: 出力の厳密な上限
<!-- ノート: 費用の上限を確実に決めたいときは max_tokens を使います。effort を上げるときは、max_tokens を大きくします。 -->
---
<!-- _class: summary -->
# まとめ
考える過程のトークンも出力に数えるので、出力の上限は max_tokens で決めます。
<!-- ノート: 考える量は、effort を変えて調整します。 -->
