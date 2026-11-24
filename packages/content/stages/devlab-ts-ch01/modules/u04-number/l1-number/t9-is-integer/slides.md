---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 4-1-9
title: 整数かどうか確かめる
takeaway: "Number.isInteger(数) で整数か確かめ、! で「そうでない」を表します。"
introduces: ["Number.isInteger", "!"]
requires: ["const", "整数", "小数", "number", "boolean", "true", "false", "Number.isFinite", "Math.round", "throw", "new Error", "**", "||"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 4-1-9 整数かどうか確かめる

<!-- ノート: この動画では、整数かどうかを確かめる方法を学びます。 -->

---

# 箱に入れる個数を確かめる

小数を受け付けられない個数や桁数は、number 型と分かっていても整数か確かめる必要があります。

<!-- ノート: 箱の仕切りに、品物を一つずつ入れます。 一つの仕切りに、一個ずつ入れる決まりです。 半端な個数の注文は、そのままでは受け付けられません。 -->

---

# 覚えること

Number.isInteger(数) で整数か確かめ、! で「そうでない」を表します。

<!-- ノート: びっくりマークは、真偽値を反対にします。 -->

---

# 整数かどうか確かめる

```ts
// 注文数が整数でないかを確かめる
const fractional = !Number.isInteger(8.75);
```

<!-- ノート: `Number.isInteger` は整数なら `true`、半端な小数なら `false` を返します。`NaN` や正負の `Infinity` も整数ではありません。 -->

---

# 確かめること

まず `!true` は `false`、`!false` は `true` です。整数か確かめる式の前に `!` を付ければ、整数でないときに `true` になります。

<!-- ノート: まず `!true` は `false`、`!false` は `true` です。整数か確かめる式の前に `!` を付ければ、整数でないときに `true` になります。 -->

---

<!-- _class: summary -->
# まとめ

Number.isInteger(数) で整数か確かめ、! で「そうでない」を表します。

<!-- ノート: Number.isInteger(数) で整数か確かめ、! で「そうでない」を表します。 -->
