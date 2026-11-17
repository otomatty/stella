---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 1-5-4
title: 文字列を整える・置き換える
takeaway: "空白や大文字小文字をそろえ、置き換える範囲を選びます。"
introduces: ["trim", "toLowerCase", "replaceAll", "replace", "正規表現"]
requires: ["string"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-5-4 文字列を整える・置き換える

<!-- ノート: この動画は書き方ガイドを操作して説明します。ここは短く読み返すための版です。 -->

---

# 入力の表記がそろわない

前後の空白と英字の大小をそろえて比べます。

<!-- ノート: 仕事で文字列を扱うときも、欲しい結果を先に決めます。 -->

---

# 覚えること

空白や大文字小文字をそろえ、置き換える範囲を選びます。

<!-- ノート: 空白や大文字小文字をそろえ、置き換える範囲を選びます。 -->

---

# 最小のコード

```ts
// 部署コードを小文字にそろえます
const dept = "Sales-01".toLowerCase();
// 結果: dept は "sales-01"
```

<!-- ノート: コメントを読み、どの行が何をするか確かめてください。 -->

---

# 見比べる

| 書き方 | 変わる範囲 |
| --- | --- |
| trim / toLowerCase | 前後の空白 / 英字の大小 |
| replace に文字列 | 最初の一致だけ |
| replaceAll に文字列 | すべての一致 |
| replace に `/[0-9]/g` | 数字すべて |

参考: [サバイバルTypeScript string型](https://typescriptbook.jp/reference/values-types-variables/string)。書き方と例は教材独自のものです。

<!-- ノート: 表の違いを、ガイドのテストで確かめる値に照らします。 -->

---

<!-- _class: summary -->
# まとめ

空白や大文字小文字をそろえ、置き換える範囲を選びます。

<!-- ノート: ガイドのヒント 1 に戻り、日本語の一行に合う書き方を選びます。 -->
