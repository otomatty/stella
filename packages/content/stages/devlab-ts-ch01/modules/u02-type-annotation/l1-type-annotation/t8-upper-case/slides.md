---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 2-1-8
title: 大文字にする
takeaway: ".toUpperCase() で、英字を大文字にできます。"
introduces: ["toUpperCase"]
requires: ["const", "文字列", "メソッド", "呼び出す"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 2-1-8 大文字にする

<!-- ノート: この動画では、英字を大文字にする方法を学びます。 -->

---

# 表示の表記をそろえる

棚の番号を見やすく表示します。入力された英字に小文字が混じっているとき、表示をどうそろえればよいでしょうか。

<!-- ノート: お店の入り口に、営業中の看板を出しました。 看板で伝える意味は変わりません。 -->

---

# 覚えること

.toUpperCase() で、英字を大文字にできます。

<!-- ノート: 大文字に変えるメソッドが、toUpperCase です。 最後に、空のかっこを書きましょう。 -->

---

# 大文字にする

```ts
// 看板に使う文字列を用意する
const sign = "open";
// 看板に使う英字を大文字にする
const signText = sign.toUpperCase();
```

<!-- ノート: 看板に出す「open」を大文字にしましょう。小文字が順に、大文字に置き換わります。できたのは、大文字の「OPEN」です。この文字列を、signText に入れました。 -->

---

# 数字や記号はそのまま

英字の小文字は大文字になります。もとから大文字の英字や、数字や記号はそのまま残ります。

参考資料は[サバイバルTypeScript: string型 (string)](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: 英字の小文字は大文字になります。もとから大文字の英字や、数字や記号はそのまま残ります。 -->

---

<!-- _class: summary -->
# まとめ

.toUpperCase() で、英字を大文字にできます。

<!-- ノート: .toUpperCase() で、英字を大文字にできます。 -->
