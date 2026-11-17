---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 1-5-1
title: 文字列を探す
takeaway: "探したい場所と、真偽か位置かに合わせて書き方を選びます。"
introduces: ["メソッド", "startsWith", "endsWith", "indexOf", "lastIndexOf", "boolean"]
requires: ["const", "変数", "文字列", "string", "引数", "戻り値", "型注釈", "number"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-5-1 文字列を探す

<!-- ノート: コードと値の動きから、文字列を探す書き方を確かめます。 -->

---

# 注文番号を見分ける

注文番号は `ORD-42-JP` です。

先頭と末尾が、決まりに合うか調べるには？

<!-- ノート: 先頭と末尾に注目します。問いの答えはまだ示しません。 -->

---

# 覚えること

探したい場所と、真偽か位置かに合わせて書き方を選びます。

<!-- ノート: 探したい場所と、真偽か位置かに合わせて書き方を選びます。 -->

---

# 先頭と末尾を調べる

```ts
// 注文番号 order を作り、"ORD-42-JP" を入れる
const order = "ORD-42-JP";
// 注文番号が "ORD-" で始まるかを表示する
console.log(order.startsWith("ORD-"));
// 結果: true
```

末尾なら `.endsWith("-JP")` を使います。

<!-- ノート: メソッドは、値に対する操作の名前です。結果は真を表す true か、偽を表す false です。boolean は、この真偽を表す型です。 -->

---

# ゼロは見つかった位置

`"A-B-C"` の位置は `0, 1, 2, 3, 4` です。

`indexOf("-")` は `1`、`lastIndexOf("-")` は `3`。

`indexOf("A")` は `0`、`indexOf("#")` は `-1`。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)。型と表記の背景資料です。操作と業務例は書き方ガイドを素材に再構成しています。

<!-- ノート: 最初と最後の一致を区別します。よくある間違いは、0 を見つからない印だと思うことです。問6・問7・問11・問16で、目的に合う操作を選んでください。 -->

---

<!-- _class: summary -->
# まとめ

探したい場所と、真偽か位置かに合わせて書き方を選びます。

<!-- ノート: 探したい場所と、真偽か位置かに合わせて書き方を選びます。 -->
