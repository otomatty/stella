---
sourceRefs: [SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-number]
id: 1-3-14
title: 2桁にそろえる
takeaway: ".padStart() で、決まった桁数になるよう前を埋められます。"
introduces: [".padStart()"]
requires: ["String()", "文字列", "メソッド", "引数", "const", "Math.floor", "割り算", "%", "テンプレートリテラル"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-14 2桁にそろえる

<!-- ノート: この動画では、桁数をそろえる方法を学びます。 -->

---

# 時刻の表示をどうそろえる？

時計では、分も二桁で表示します。

コードでは、どう表すのでしょうか。

<!-- ノート: 時計では、分も二桁で表示します。 時刻の表示をどうそろえる？ -->

---

# 覚えること

.padStart() で、決まった桁数になるよう前を埋められます。

<!-- ノート: .padStart() で、決まった桁数になるよう前を埋められます。 -->

---

# 埋める位置と文字を指定

```ts
// 5を文字列にして前を0で埋める
const padded = String(5).padStart(2, "0");
```

<!-- ノート: 引数には、仕上がりの長さと埋める文字を渡します。 -->

---

# 三桁で表示すると、どんな文字列でしょうか。

```ts
// 7の前を0で埋めて3桁にする
const label = String(7).padStart(3, "0");
```

答えは「007」です。

<!-- ノート: 最初は、一桁の文字列です。 三桁にするには、二文字足りません。 -->

---

<!-- _class: summary -->
# まとめ

.padStart() で、決まった桁数になるよう前を埋められます。

<!-- ノート: .padStart() で、決まった桁数になるよう前を埋められます。 -->
