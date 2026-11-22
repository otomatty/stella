---
sourceRefs: [SRC-typescriptbook-statements-if-else, SRC-typescriptbook-values-types-variables-string]
id: 1-3-3
title: そうでなければ
progressRevision: 2
takeaway: "else と else if で、条件ごとに別の処理を選べます。"
introduces: ["else", "else if"]
requires: ["if", "===", ">=", "true", "false", "文字列", "const", "let", "再代入"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-3 そうでなければ

<!-- ノート: この動画では、条件で処理を分ける書き方を学びます。 -->

---

# どの持ち物を選ぶ？

雨なら、傘を持って出かけます。

コードでは、どう表すのでしょうか。

<!-- ノート: 雨なら、傘を持って出かけます。 どの持ち物を選ぶ？ -->

---

# 覚えること

else と else if で、条件ごとに別の処理を選べます。

<!-- ノート: else と else if で、条件ごとに別の処理を選べます。 -->

---

# 条件を上から並べる

```ts
// 雨の条件を確かめる
if (weather === "雨") {
  // 持ち物に傘を選ぶ
  item = "傘";
}
```

条件を足すときは、閉じかっこのあとに `else if` を書きます。どれにも合わないときの処理は `else` に書きます。

<!-- ノート: 最初に条件が成り立つところだけを実行します。 -->

---

# 結果を確かめる

70 点は 80 点以上ではありません。 60 点以上には当てはまります。

答えは B です。

<!-- ノート: そこで B が選ばれました。 -->

---

<!-- _class: summary -->
# まとめ

else と else if で、条件ごとに別の処理を選べます。

<!-- ノート: else と else if で、条件ごとに別の処理を選べます。 -->
