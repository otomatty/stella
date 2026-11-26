---
sourceRefs: [SRC-typescriptbook-values-types-variables-boolean, SRC-typescriptbook-values-types-variables-truthy-falsy-values, SRC-typescriptbook-builtin-api-regexp]
id: 6-1-2
title: 合う文字が含まれるか調べる
takeaway: "正規表現.test(文字列) は、合う部分があれば true を返します。"
introduces: ["test"]
requires: ["正規表現", "文字列", "const", "メソッド", "引数", "boolean", "true", "false", ".includes()"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 6-1-2 合う文字が含まれるか調べる

<!-- ノート: この動画では、決まった形の文字が含まれるかを調べる方法を学びます。 -->

---

# 部屋の札に数字はある？

「会議室」「305」「受付」「B2倉庫」の札があります。
数字のどれかが含まれる札を探すには、どう書けばよいでしょうか。

<!-- ノート: 数字だけの札と、文字に数字が混ざった札があります。どちらにも数字があるかを調べたい場面です。 -->

---

# 覚えること

正規表現.test(文字列) は、合う部分があれば true を返します。

<!-- ノート: test は、探す形に合う文字が含まれるかを調べるメソッドです。一つもなければ false を返します。 -->

---

# 数字が1文字でもあれば true

```ts
const hasNumber = /\d/.test("B2倉庫");
console.log(hasNumber); // => true
```

`/\d/` は半角数字1文字を表します。この式の結果は `true` です。

<!-- ノート: 正規表現の後ろに test を書き、かっこの中に調べる文字列を渡します。B2倉庫の2が合うので、console.log には true と出ます。全体が数字である必要はありません。 -->

---

# 探す形を替える

`/[A-Z]/` は英大文字1文字を表します。
`/[A-Z]/.test("B2倉庫")` は `true`、`/[A-Z]/.test("305")` は `false` です。

`includes("2")` は決まった文字を探します。数字のどれかを探すには、正規表現の `test` を使います。

参考: サバイバルTypeScript [boolean](https://typescriptbook.jp/reference/values-types-variables/boolean)・[truthy-falsy-values](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)・[RegExp](https://typescriptbook.jp/reference/builtin-api/regexp)。説明とコード例は教材用に作成しています。

<!-- ノート: 探す形を英大文字に替えても、合う部分が一つあれば true という決まりは同じです。includes に数字という形をそのまま渡すことはできません。 -->

---

<!-- _class: summary -->
# まとめ

正規表現.test(文字列) は、合う部分があれば true を返します。

<!-- ノート: 正規表現.test(文字列) は、合う部分があれば true を返します。 -->
