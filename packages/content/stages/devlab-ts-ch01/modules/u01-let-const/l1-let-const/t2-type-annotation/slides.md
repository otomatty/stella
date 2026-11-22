---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation, SRC-typescriptbook-values-types-variables-number]
id: 1-1-2
progressRevision: 2
title: 型注釈の書き方
takeaway: "型注釈は、値の種類をコロンの後ろに書く書き方です。"
introduces: ["型注釈", "型", "number"]
requires: ["関数", "引数", "戻り値"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-2 型注釈の書き方

<!-- ノート: 型注釈の書き方を、身近な例とコードで確かめます。 -->

---

# 入れてよいものは何？

自動販売機の硬貨の入口には、硬貨しか入りません。

関数の入口でも、受け取る値の種類を決められるのでしょうか。

<!-- ノート: 入口ごとに入れてよいものの種類が決まっている、という身近な例から入ります。答えはまだ言いません。 -->

---

# 覚えること

型注釈は、値の種類をコロンの後ろに書く書き方です。

値の種類を型と呼び、数値の型は number です。

<!-- ノート: 引数 price の後ろの「: number」は、price が数値だという型注釈です。かっこの後ろの「: number」は、戻り値が数値だという型注釈です。金額は数なので、数値の number を選んでいます。 -->

---

# コロンの後ろを読む

```ts
// 本の値段を受け取り、支払う金額を返す関数
function addShipping(price: number): number {
  // 受け取った値段に、送料の 500 を足して返す
  return price + 500;
}
```

<!-- ノート: 引数 price の後ろの「: number」は、price が数値だという型注釈です。かっこの後ろの「: number」は、戻り値が数値だという型注釈です。金額は数なので、数値の number を選んでいます。 -->

---

# 種類はほかにもある

値の種類は、数値だけではありません。文字を表す種類は `string` と書きます。

金額や個数は数値なので `number`、名前や住所は文字なので `string` を選びます。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: string は次のトピックで詳しく扱います。ここでは、種類がほかにもあることと、金額だから number を選んだことを伝えます。 -->

---

<!-- _class: summary -->
# まとめ

型注釈は、値の種類をコロンの後ろに書く書き方です。

<!-- ノート: 型注釈は、値の種類をコロンの後ろに書く書き方です。 -->
