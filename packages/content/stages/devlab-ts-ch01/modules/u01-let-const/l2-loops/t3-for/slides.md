---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-for-of, SRC-typescriptbook-values-types-variables-boolean]
id: 1-2-3
title: for でくり返す
progressRevision: 2
takeaway: "for は、始め・続ける条件・進め方を決めて、同じ処理をくり返します。"
introduces: ["for", "<=", "true", "false"]
requires: ["let", "+=", "++", "変数", "足し算", "整数", "引数", "関数", "export", "number", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-3 for でくり返す

<!-- ノート: for の 1 行を読んで、何回くり返し、変数がどう変わるかを言える。 -->

---

# トラックを五周する

陸上の練習で、トラックを 5 周走ります。

どの周から始まり、どの周で走り終わるでしょうか。

<!-- ノート: スタートの線から、1 周目を走ります。どの周から始まり、どの周で走り終わるでしょうか。 -->

---

# 覚えること

for は、始め・続ける条件・進め方を決めて、同じ処理をくり返します。

<!-- ノート: 合計の変数は、先に 0 にしておきます。条件が成り立つ間だけ中身を実行します。 -->

---

# for の三つの部分

```ts
// 一周目から五周目まで一周ずつ進む
for (let i = 1; i <= 5; i++) {
  // 周回の番号を合計に足す
  total += i;
}
```

<!-- ノート: 合計の変数は、先に 0 にしておきます。条件が成り立つ間だけ中身を実行します。 -->

---

# 五周目の次で止まる

`i` が 5 のとき、`i <= 5` は `true` です。6 になると `false` で止まり、合計は 15 です。

参考はサバイバルTypeScriptの[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)です。説明と例は教材用に独自作成しています。

<!-- ノート: 最後の周も条件に含めるので、五周分の番号が合計に入ります。 -->

---

<!-- _class: summary -->
# まとめ

for は、始め・続ける条件・進め方を決めて、同じ処理をくり返します。

<!-- ノート: for は、始め・続ける条件・進め方を決めて、同じ処理をくり返します。 -->
