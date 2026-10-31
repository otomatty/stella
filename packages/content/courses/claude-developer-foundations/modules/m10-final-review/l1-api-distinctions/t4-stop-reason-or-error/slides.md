---
sourceRefs: [SRC-claude-docs-stop-vs-errors-20261031, SRC-claude-docs-errors-20261031]
id: 10-1-4
title: エラーではない止まり方
takeaway: "stop_reason は成功した応答が止まった理由で、HTTP のエラーとは分けて扱います。"
introduces: []
requires: [stop_reason, HTTP ステータス, refusal, 途中で切れた応答, 送り直し]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# エラーではない止まり方
<!-- ノート: 応答が止まった理由と、リクエストの失敗を分けます。 -->
---
# 同じ扱いにしていた
max_tokens で切れた応答と 529 のエラーを、同じ送り直しの処理に入れていました。
<!-- ノート: 2 つは、別の種類の出来事です。 -->
---
# 分けて扱う
stop_reason は成功した応答が止まった理由で、HTTP のエラーとは分けて扱います。
<!-- ノート: stop_reason の応答には Claude の本文が入り、エラーの応答にはエラーの内容だけが入ります。 -->
---
# 違い
| | stop_reason | HTTP のエラー |
| --- | --- | --- |
| 届くもの | 成功した応答 | 4xx・5xx と、エラーの内容 |
| 例 | end_turn・max_tokens・refusal | 400・429・529 |
| 扱い | 値ごとに分ける | 一時的なものだけ送り直す |
<!-- ノート: refusal も、HTTP 200 の応答で届きます。 -->
---
# よくある取り違え
- refusal を例外の処理で拾おうとする
- max_tokens で切れた応答を、同じ設定のまま送り直す
<!-- ノート: 拒否は例外にならず、切れた応答は同じ上限で送ればまた切れます。max_tokens を上げるか、続きを書かせます。 -->
---
<!-- _class: summary -->
# まとめ
stop_reason は成功した応答が止まった理由で、HTTP のエラーとは分けて扱います。
<!-- ノート: 単元の課題では、stop_reason の分岐と、エラーの扱いを別々に書きます。 -->
