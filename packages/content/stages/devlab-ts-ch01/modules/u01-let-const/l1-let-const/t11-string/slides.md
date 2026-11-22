---
sourceRefs: [SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-type-annotation]
id: 1-1-11
title: 文字列の書き方
takeaway: "文字は引用符で囲んで書き、その種類を string と呼びます。"
introduces: ["文字列", "string", "引用符"]
requires: ["関数", "引数", "型注釈", "number"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-11 文字列の書き方

<!-- ノート: 文字列の書き方を、身近な例とコードで確かめます。 -->

---

# 名前はどう書く？

注文には、個数のほかに、お客さまの名前もあります。

名前のような文字は、コードでどう書くのでしょうか。

<!-- ノート: 数は number で表しました。ここでは、文字を表す書き方を見ます。答えはまだ言いません。 -->

---

# 覚えること

文字は引用符で囲んで書き、その種類を string と呼びます。

数値の number とは別の種類です。

<!-- ノート: 文字は、ダブルクォートという引用符で囲んで書きます。引用符で囲んだ値を文字列と呼びます。string は文字列を表す種類で、引数と戻り値の型注釈に書いています。 -->

---

# 文字を受け取って返す

```ts
// 名前を受け取り、その名前を返す関数
function customerName(name: string): string {
  // 受け取った名前をそのまま返す
  return name;
}
// 田中という名前を渡して、関数を呼ぶ
customerName("田中");
```

<!-- ノート: 文字は、ダブルクォートという引用符で囲んで書きます。引用符で囲んだ値を文字列と呼びます。string は文字列を表す種類で、引数と戻り値の型注釈に書いています。 -->

---

# よくある間違い

数値の `3` と、文字列の `"3"` は別の値です。

number の引数に `"3"` を渡すと、型のエラーになります。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)・[型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)。説明と例は教材用に独自作成しています。

<!-- ノート: 見た目が同じ 3 でも、引用符で囲むと文字列です。種類が合わない値は渡せません。 -->

---

<!-- _class: summary -->
# まとめ

文字は引用符で囲んで書き、その種類を string と呼びます。

<!-- ノート: 文字は引用符で囲んで書き、その種類を string と呼びます。 -->
