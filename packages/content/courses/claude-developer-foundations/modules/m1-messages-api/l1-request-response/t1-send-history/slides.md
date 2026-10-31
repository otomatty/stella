---
sourceRefs: [SRC-claude-docs-messages-20261031]
id: 1-1-1
title: 会話は毎回まとめて送る
takeaway: "Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。"
introduces: [リクエスト, 応答, messages, role, 会話の履歴]
requires: [Messages API]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 会話は毎回まとめて送る
<!-- ノート: 続けてやり取りするときの送り方を確かめます。 -->
---
# 前の発言を忘れている
「A-1024 です」とだけ送ると、何の番号か通じません。
<!-- ノート: 2 回目のリクエストに、1 回目のやり取りを入れていない失敗です。 -->
---
# 毎回まとめて送る
Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。
<!-- ノート: 公式ドキュメントは、この API をステートレス、つまり状態を持たないと説明しています。 -->
---
# messages の配列
```js
const messages = [
  { role: "user", content: "注文の状況を教えて" },
  { role: "assistant", content: "注文番号を教えてください" },
  { role: "user", content: "A-1024 です" },
];
```
<!-- ノート: role は発言した側です。user と assistant が交互に並び、最後が新しい発言です。 -->
---
# 履歴はアプリが持つ
- 受け取った応答を、assistant の発言として履歴に足す
- 次の発言を user として足し、配列ごと送る
<!-- ノート: 会話の履歴を持つのは API ではなく、呼び出す側のアプリです。 -->
---
<!-- _class: summary -->
# まとめ
Messages API は会話を覚えないので、それまでのやり取りを messages の配列で毎回送ります。
<!-- ノート: 履歴が長くなったときの扱いは、コンテキストの単元で扱います。 -->
