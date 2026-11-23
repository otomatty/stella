---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 2-1-6
title: 3桁ごとに区切る
takeaway: "数.toLocaleString() で、3桁ごとにカンマを入れた文字列になります。"
introduces: ["toLocaleString"]
requires: ["const", "number", "string", "文字列", "メソッド", "呼び出す"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 2-1-6 3桁ごとに区切る

<!-- ノート: この動画では、数を3桁ごとに区切る方法を学びます。 -->

---

# 桁の多い金額を読む

請求の明細に大きな金額が並びます。桁を数えなくても読みやすい表示にするには、どうすればよいでしょうか。

<!-- ノート: 桁の多い金額を、値札に書きました。 桁の並びを追いやすくなりました。 -->

---

# 覚えること

数.toLocaleString() で、3桁ごとにカンマを入れた文字列になります。

<!-- ノート: 数値を、表示形式に合った文字列にするメソッドです。 最後のかっこで、このメソッドを呼び出します。 -->

---

# 3桁ごとに区切る

```ts
// 表示する金額を数値で用意する
const amount = 76840;
// 金額を表示用の文字列にする
const amountText = amount.toLocaleString();
```

<!-- ノート: 受け取った金額を、画面に表示しましょう。日本向けの表示を選ぶには、ja-JP を渡します。返ってきたのは、カンマの付いた文字列です。 -->

---

# 日本向けの表示を指定する

区切り方や記号は地域によって異なります。日本向けにそろえる場合は、かっこの中に `"ja-JP"` を渡します。

参考資料は[サバイバルTypeScript: number型 (number)](https://typescriptbook.jp/reference/values-types-variables/number)です。コード例は教材用に作成しています。

<!-- ノート: 区切り方や記号は地域によって異なります。日本向けにそろえる場合は、かっこの中に `"ja-JP"` を渡します。 -->

---

<!-- _class: summary -->
# まとめ

数.toLocaleString() で、3桁ごとにカンマを入れた文字列になります。

<!-- ノート: 数.toLocaleString() で、3桁ごとにカンマを入れた文字列になります。 -->
