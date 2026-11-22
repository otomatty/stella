---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-typescriptbook-values-types-variables-boolean]
id: 2-1-3
title: 比べた結果を返す
takeaway: "比べた結果は true か false なので、そのまま boolean として返せます。"
introduces: []
requires: ["関数", "引数", "戻り値", "型注釈", "number", "boolean", "return", ">=", "true", "false", "if", "else"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 2-1-3 比べた結果を返す

<!-- ノート: この動画では、比べた結果を返す方法を学びます。 -->

---

# 乗れるかどうかを伝える

受付で測った身長をもとに、乗り物に乗れるかどうかを知らせます。比べた結果を関数で渡すには、どう書けばよいでしょうか。

<!-- ノート: 乗り物の入り口で、身長を測りました。 基準に届かない場合は、乗れません。 -->

---

# 覚えること

比べた結果は true か false なので、そのまま boolean として返せます。

<!-- ノート: 乗れるかどうかは、boolean の値です。 その式を、return の後ろに置きましょう。 -->

---

# 比べた結果を返す

```ts
// 身長から、乗り物に乗れるかを返す関数
function canRide(height: number): boolean {
  // 身長が基準以上かを比べた結果を返す
  return height >= 120;
}
```

<!-- ノート: 乗れるかを調べる関数を呼び出しましょう。測った身長の 138 を渡します。138 は基準を超えた値です。比べた結果の true が戻りました。 -->

---

# ちょうど基準に届くとき

「以上」は基準と同じ値も含みます。この例では、ちょうど 120 センチでも `true` を返します。

参考資料は[Expressions and operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators#comparison_operators)、[サバイバルTypeScript: boolean型 (boolean)](https://typescriptbook.jp/reference/values-types-variables/boolean)です。コード例は教材用に作成しています。

<!-- ノート: 「以上」は基準と同じ値も含みます。この例では、ちょうど 120 センチでも `true` を返します。 -->

---

<!-- _class: summary -->
# まとめ

比べた結果は true か false なので、そのまま boolean として返せます。

<!-- ノート: 比べた結果は true か false なので、そのまま boolean として返せます。 -->
