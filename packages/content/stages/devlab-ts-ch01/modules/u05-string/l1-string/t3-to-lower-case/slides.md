---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 5-1-3
title: 小文字にそろえる
progressRevision: 2
takeaway: "文字列.toLowerCase() で、英字をすべて小文字にします。"
introduces: ["toLowerCase"]
requires: ["const", "文字列", "メソッド"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 5-1-3 小文字にそろえる

<!-- ノート: この動画では、英字を小文字にそろえる方法を学びます。 -->

---

# 棚の名前の表記をそろえる

別々の担当者が登録した棚の名前を、一枚の一覧にまとめます。英字の大きさがばらばらだと、同じ名前も違って見えることがあります。

<!-- ノート: 棚の名前を、担当者が英字で書きました。 -->

---

# 覚えること

文字列.toLowerCase() で、英字をすべて小文字にします。

<!-- ノート: 文字列.toLowerCase() で、英字をすべて小文字にします。 -->

---

# 小文字にそろえる

```ts
// 棚の名前にある英字を小文字にそろえる
const shelfKey = "RaCK８".toLowerCase();
```

<!-- ノート: 元の札には、大文字と小文字が混ざっています。 そのうち大文字の英字が、変わる部分です。 小文字にそろえた名前を、一覧用に保存しました。 -->

---

# 英字以外の文字

数字や記号など、大文字と小文字の区別がない文字はそのまま残ります。

参考資料は[サバイバルTypeScriptの string 型](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: 数字や記号など、大文字と小文字の区別がない文字はそのまま残ります。 -->

---

<!-- _class: summary -->
# まとめ

文字列.toLowerCase() で、英字をすべて小文字にします。

<!-- ノート: 文字列.toLowerCase() で、英字をすべて小文字にします。 -->
