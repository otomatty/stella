---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
id: 8-1-1
title: any を具体的な型に直す
progressRevision: 2
takeaway: "any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。"
introduces: ["any","プロパティ"]
requires: ["型注釈","number","string","boolean","length","メソッド","toFixed","return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 8-1-1 any を具体的な型に直す

<!-- ノート: この動画では、any を具体的な型に直す方法を学びます。 -->

---

# 送料の表示が止まった

型の確認を通ったのに、送料を表示すると止まりました。名前のつづりを、どこで確かめればよいでしょうか。

<!-- ノート: 型の確認を通ったのに、送料を表示すると止まりました。名前のつづりを、どこで確かめればよいでしょうか。 -->

---

# 覚えること

any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。

<!-- ノート: any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。 -->

---

# any を具体的な型に直す

```ts
function shippingLabel(fee: number): string {
  return fee.toFixed(0);
}
console.log(shippingLabel(650)); // => "650"
```

<!-- ノート: 送料は number、表示する戻り値は string です。正しいメソッド名は toFixed です。650 を渡すと、数字の文字列を返して表示します。 -->

---

# 名前の間違いを型で見つける

| 引数の型 | メソッド名 | 型の確認 |
| --- | --- | --- |
| `any` | `fee.toFixd(0)` | 通る |
| `number` | `fee.toFixd(0)` | エラー |
| `number` | `fee.toFixed(0)` | 通る |

<!-- ノート: any だと、間違った toFixd でも型の確認を通ります。number に直すと、存在しない名前を見つけられます。正しいつづりは toFixed です。 -->

---

<!-- _class: summary -->
# まとめ

any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。

<!-- ノート: any を具体的な型に直すと、名前の間違いを型の確認で見つけられます。 -->
