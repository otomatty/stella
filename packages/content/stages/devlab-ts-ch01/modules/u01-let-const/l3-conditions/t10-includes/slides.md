---
sourceRefs: [SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-for-of]
id: 1-3-10
title: 含まれるかを調べる
takeaway: ".includes() で、文字列に文字が含まれるかを調べられます。"
introduces: []
requires: [".includes()", "メソッド", "文字列", "true", "false", "const", "for-of", "if", "++"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-10 含まれるかを調べる

<!-- ノート: この動画では、文字が含まれるかを調べる方法を学びます。 -->

---

# 表示に卵はある？

箱の表示から、材料の名前を探します。

コードでは、どう表すのでしょうか。

<!-- ノート: 箱の表示から、材料の名前を探します。 表示に卵はある？ -->

---

# 覚えること

.includes() で、文字列に文字が含まれるかを調べられます。

<!-- ノート: .includes() で、文字列に文字が含まれるかを調べられます。 -->

---

# 文字列から探す

```ts
// 原材料に卵の文字があるか調べる
const found = "小麦、卵、砂糖".includes("卵");
```

<!-- ノート: かっこの中に、探す文字を渡します。 -->

---

# この文字列に、ピーは含まれるでしょうか。

```ts
// 文字列の中にピーがあるか調べる
const found = "apple".includes("p");
```

答えは true です。

<!-- ノート: 探す範囲はアップルの文字列です。 ピーはその中に見つかります。 -->

---

<!-- _class: summary -->
# まとめ

.includes() で、文字列に文字が含まれるかを調べられます。

<!-- ノート: .includes() で、文字列に文字が含まれるかを調べられます。 -->
