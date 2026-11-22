---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-statements-if-else]
id: 1-3-9
title: どちらかが合えば
takeaway: "|| は、どちらかの条件が true なら true になります。"
introduces: ["||"]
requires: ["boolean", "true", "false", "if", "const", ">="]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-9 どちらかが合えば

<!-- ノート: この動画では、どちらかが合えばよい条件を学びます。 -->

---

# 送料無料になるのは？

まず、買い物の金額が条件に合うかを見ます。

コードでは、どう表すのでしょうか。

<!-- ノート: まず、買い物の金額が条件に合うかを見ます。 送料無料になるのは？ -->

---

# 覚えること

|| は、どちらかの条件が true なら true になります。

<!-- ノート: || は、どちらかの条件が true なら true になります。 -->

---

# 条件を縦棒でつなぐ

```ts
// 条件がどちらか一方でも成り立つか調べる
if (a || b) {
  // 利用できると表示する
  console.log("利用できます");
}
```

<!-- ノート: 右側が合うだけでも、中に進みます。 -->

---

# この計算の結果は、どちらの値でしょうか。

```ts
// どちらかの条件に合うかを調べる
const allowed = false || true;
```

答えは true です。

<!-- ノート: 左側は false です。 右側は true なので、少なくとも片方は成り立ちます。 -->

---

<!-- _class: summary -->
# まとめ

|| は、どちらかの条件が true なら true になります。

<!-- ノート: || は、どちらかの条件が true なら true になります。 -->
