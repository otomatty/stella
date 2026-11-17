---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 1-5-2
title: 文字列を探す
takeaway: "探したい場所と、真偽か位置かに合わせて書き方を選びます。"
introduces: ["startsWith", "endsWith", "indexOf", "lastIndexOf"]
requires: ["string", "boolean"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-5-2 文字列を探す

<!-- ノート: この動画は書き方ガイドを操作して説明します。ここは短く読み返すための版です。 -->

---

# 注文番号の先頭を確かめたい

先頭か末尾か、場所が必要かを決めます。

<!-- ノート: 仕事で文字列を扱うときも、欲しい結果を先に決めます。 -->

---

# 覚えること

探したい場所と、真偽か位置かに合わせて書き方を選びます。

<!-- ノート: 探したい場所と、真偽か位置かに合わせて書き方を選びます。 -->

---

# 最小のコード

```ts
// 注文番号が決まった形で始まるかを調べます
const isOrder = "ORD-2025-001".startsWith("ORD-");
// 結果: isOrder は true
```

<!-- ノート: コメントを読み、どの行が何をするか確かめてください。 -->

---

# 見比べる

| 書き方 | 返す値 |
| --- | --- |
| startsWith / endsWith | 先頭・末尾が一致するかの真偽 |
| indexOf / lastIndexOf | 最初・最後の位置。見つからなければ -1 |

参考: [サバイバルTypeScript string型](https://typescriptbook.jp/reference/values-types-variables/string)。書き方と例は教材独自のものです。

<!-- ノート: 表の違いを、ガイドのテストで確かめる値に照らします。 -->

---

<!-- _class: summary -->
# まとめ

探したい場所と、真偽か位置かに合わせて書き方を選びます。

<!-- ノート: ガイドのヒント 1 に戻り、日本語の一行に合う書き方を選びます。 -->
