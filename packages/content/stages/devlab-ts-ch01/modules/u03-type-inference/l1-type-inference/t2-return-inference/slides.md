---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 3-1-2
title: 戻り値の型を任せる
progressRevision: 2
takeaway: "戻り値の型を書かないと、return の値から型が決まります。"
introduces: []
requires: ["型推論", "戻り値", "return", "型注釈", "引数", "number"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 3-1-2 戻り値の型を任せる

<!-- ノート: この動画では、戻り値の型を書かずに任せる方法を学びます。 -->

---

# レジから出てくるもの

買い物かごの金額に包装代を足す処理を書きます。この関数から何が戻るかは、どこを見れば分かるでしょうか。

<!-- ノート: かごの商品を、レジに持っていきました。会計が終わると、レシートが出ます。 -->

---

# 覚えること

戻り値の型を書かないと、return の値から型が決まります。

<!-- ノート: 引数には、これまでどおり型注釈を書きます。閉じ丸かっこの後ろは、戻り値の型を書く位置です。今回はその位置に、型注釈を書きません。return の右にある式から、戻り値の型が決まります。 -->

---

# 戻り値の型を書かずに関数を作る

```ts
// 商品の代金を受け取り、包装代を足す関数を作る
function withWrapping(price: number) {
  // 包装代を足した金額を返す
  return price + 130;
}
```

<!-- ノート: 商品代として 760 を受け取ります。包装代の 130 を足した金額は、890 です。返す式は数なので、戻り値の型は number になります。どの代金を渡しても、数を返す関数です。 -->

---

# 戻り値の型は number

`withWrapping` の戻り値の型は `number` です。商品代が 760 円なら、戻り値は 890 です。

参考資料は[サバイバルTypeScript「型推論」](https://typescriptbook.jp/reference/values-types-variables/type-inference)です。

<!-- ノート: `withWrapping` の戻り値の型は `number` です。商品代が 760 円なら、戻り値は 890 です。 -->

---

<!-- _class: summary -->
# まとめ

戻り値の型を書かないと、return の値から型が決まります。

<!-- ノート: 戻り値の型を書かないと、return の値から型が決まります。 -->
