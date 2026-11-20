---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation, SRC-typescriptbook-functions-function-declaration]
id: 1-1-1
title: 関数のしくみ
takeaway: "関数は、値を受け取り、決まった処理をして、値を返すまとまりです。"
introduces: ["関数", "引数", "戻り値", "return", "型注釈", "number", "export", "function"]
requires: []
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-1 関数のしくみ

<!-- ノート: 関数のしくみを、コードと値の動きで確かめます。 -->

---

# 注文数をどこで受け取る？

注文した数を、コードで確かめたいとき。

どこが入力で、どこが出力でしょうか。

<!-- ノート: 関数の外側には、受け取るものと返すものの決まりがあります。ここでは答えをまだ示しません。 -->

---

# 覚えること

関数は、値を受け取り、決まった処理をして、値を返すまとまりです。

引数は受け取る値、戻り値は返す値です。

<!-- ノート: function は関数を作る印、export は別のファイルから使えるようにする印です。quantity は引数の名前です。型注釈は値の種類を示します。かっこの中の number は入力、後ろの number は出力の型です。return は値を返して関数を終えます。 -->

---

# 書き方を読む

```ts
// 注文数を受け取り、その数を返す関数を作る
export function confirmedQuantity(quantity: number): number {
  // 受け取った数を返す
  return quantity;
  // 関数の中身はここまで
}
```

参考: [サバイバルTypeScript: 型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)・[サバイバルTypeScript: 関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。説明と例は教材用に独自作成しています。

<!-- ノート: function は関数を作る印、export は別のファイルから使えるようにする印です。quantity は引数の名前です。型注釈は値の種類を示します。かっこの中の number は入力、後ろの number は出力の型です。return は値を返して関数を終えます。 -->

---

<!-- _class: summary -->
# まとめ

関数は、値を受け取り、決まった処理をして、値を返すまとまりです。

<!-- ノート: 関数は、値を受け取り、決まった処理をして、値を返すまとまりです。 -->
