---
sourceRefs: [SRC-typescriptbook-values-types-variables-number]
id: 4-1-7
title: 計算に使える数か確かめる
takeaway: "Number.isFinite(数) は、NaN でも Infinity でもない数なら true です。"
introduces: ["Number.isFinite", "Infinity"]
requires: ["const", "割り算", "number", "型注釈", "boolean", "true", "false", "NaN", "Number.parseInt", "Math.round"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 4-1-7 計算に使える数か確かめる

<!-- ノート: この動画では、計算に使える数かを確かめる方法を学びます。 -->

---

# 一箱あたりの重さを計算する

number 型と分かっていても、集計に使える値かどうかは型だけでは判断できません。

<!-- ノート: 荷物の重さを、箱の数で割ります。 記録した箱の数が、ゼロの場合もありました。 そのときの割り算を、集計に使ってよいでしょうか？ -->

---

# 覚えること

Number.isFinite(数) は、NaN でも Infinity でもない数なら true です。

<!-- ノート: 無限大でも計算不能でもない数を、有限の数と呼びます。 -->

---

# 計算に使える数か確かめる

```ts
// 測定値が有限かを確かめる
const usable = Number.isFinite(6.25);
```

<!-- ノート: `Infinity` は無限大、`NaN` は数値として表せない結果です。どちらも型は `number` ですが、重さや個数の集計にそのまま使える値ではありません。 -->

---

# 確かめること

正または負の無限大と `NaN` では `Number.isFinite` が `false` を返します。小数やゼロは有限の数です。

<!-- ノート: 正または負の無限大と `NaN` では `Number.isFinite` が `false` を返します。小数やゼロは有限の数です。 -->

---

<!-- _class: summary -->
# まとめ

Number.isFinite(数) は、NaN でも Infinity でもない数なら true です。

<!-- ノート: Number.isFinite(数) は、NaN でも Infinity でもない数なら true です。 -->
