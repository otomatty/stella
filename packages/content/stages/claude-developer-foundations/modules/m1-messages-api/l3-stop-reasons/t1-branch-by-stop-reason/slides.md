---
sourceRefs: [SRC-claude-docs-stop-reasons-20261031]
id: 1-3-1
title: 止まった理由で分ける
takeaway: "応答の処理は、stop_reason の値ごとに分けます。"
introduces: [stop_reason, end_turn]
requires: [応答]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 止まった理由で分ける
<!-- ノート: 応答を受け取ったあとの処理の分け方を確かめます。 -->
---
# どの応答も同じに扱う
受け取った応答を、いつも完成した答えとして画面に出していました。
<!-- ノート: 途中で切れた応答や、断られた応答も同じに見えてしまいます。 -->
---
# stop_reason で分ける
応答の処理は、stop_reason の値ごとに分けます。
<!-- ノート: stop_reason は、応答が止まった理由を表す項目です。 -->
---
# 値ごとに分岐する
```js
switch (response.stop_reason) {
  case "end_turn": return showAnswer(response);
  case "max_tokens": return showTruncated(response);
  default: return showError(response);
}
```
<!-- ノート: end_turn は、Claude が答えを自然に終えたことを表します。 -->
---
# 主な値
- end_turn は、答えを終えた
- max_tokens は、出力の上限に届いた
- tool_use は、ツールを呼びたい
- refusal は、答えるのを断った
<!-- ノート: ほかに stop_sequence・pause_turn などがあります。一覧は公式ドキュメントで確かめます。 -->
---
<!-- _class: summary -->
# まとめ
応答の処理は、stop_reason の値ごとに分けます。
<!-- ノート: 上限で止まった応答と、断られた応答は、このあと詳しく扱います。 -->
