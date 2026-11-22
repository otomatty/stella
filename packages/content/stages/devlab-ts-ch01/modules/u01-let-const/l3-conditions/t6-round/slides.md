---
sourceRefs: [SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-let-and-const]
id: 1-3-6
title: 四捨五入する
takeaway: "Math.round は、小数点以下を四捨五入して整数にします。"
introduces: ["Math.round"]
requires: ["Math.floor", "小数", "整数", "引数", "戻り値", "const", "for", "+="]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-6 四捨五入する

<!-- ノート: この動画では、四捨五入の書き方を学びます。 -->

---

# 円未満の利息はどうする？

利息を計算すると、小数が出ることがあります。

コードでは、どう表すのでしょうか。

<!-- ノート: 利息を計算すると、小数が出ることがあります。 円未満の利息はどうする？ -->

---

# 覚えること

Math.round は、小数点以下を四捨五入して整数にします。

<!-- ノート: Math.round は、小数点以下を四捨五入して整数にします。 -->

---

# 四捨五入の関数

```ts
// 2.4を四捨五入する
const low = Math.round(2.4);
// 2.5を四捨五入する
const high = Math.round(2.5);
```

<!-- ノート: 戻ってくるのは、整数の値です。 -->

---

# 四捨五入すると、いくつになるでしょうか。

```ts
// 7.6を四捨五入する
const rounded = Math.round(7.6);
```

答えは 8 です。

<!-- ノート: 小数部分は 0.6 です。 0.5 以上なので、大きいほうに丸めます。 -->

---

<!-- _class: summary -->
# まとめ

Math.round は、小数点以下を四捨五入して整数にします。

<!-- ノート: Math.round は、小数点以下を四捨五入して整数にします。 -->
