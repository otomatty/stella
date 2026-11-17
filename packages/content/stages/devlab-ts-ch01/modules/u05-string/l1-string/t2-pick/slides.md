---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 5-1-2
title: 位置で取り出す
takeaway: "後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。"
introduces: ["slice", "charAt"]
requires: ["const", "文字列", "string", "メソッド", "引数", "戻り値", "型注釈", "number"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 5-1-2 位置で取り出す

<!-- ノート: コードと値の動きから、位置で取り出す書き方を確かめます。 -->

---

# 予約番号の一部を読む

予約番号は `R-824` です。

後ろの三文字だけを取り出すには？

<!-- ノート: 文字を一つずつ箱に入れて、位置を付けることを考えます。答えはまだ言いません。 -->

---

# 覚えること

後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。

<!-- ノート: 後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。 -->

---

# 位置を指定して取り出す

```ts
// 予約番号 ticket を作り、"R-824" を入れる
const ticket = "R-824";
// 後ろから 3 文字を取り出して表示する
console.log(ticket.slice(-3));
// 結果: "824"
```

後ろから三文字目から、末尾までを取り出します。

<!-- ノート: 先頭は位置0です。slice(0, 2) は終わりの位置2を含めず R- を返します。slice(-3) は後ろから三文字目から末尾までです。 -->

---

# ない位置は空の文字列

`"B203".charAt(0)` は `"B"`。

`"B203".charAt(9)` は `""`。

`charAt(-1)` で最後の文字は取れません。

参考: サバイバルTypeScript [string型](https://typescriptbook.jp/reference/values-types-variables/string)。型と表記の背景資料です。操作と業務例は書き方ガイドを素材に再構成しています。

<!-- ノート: 空の文字列は、文字が一つもない値です。charAt の負の位置を slice と同じ意味に考えるのは誤りです。問3・問4・問19で取り出す位置を確かめてください。 -->

---

<!-- _class: summary -->
# まとめ

後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。

<!-- ノート: 後ろから取り出すなら slice の負の位置、指定の一文字なら charAt を使います。 -->
