---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-annotation]
id: 2-1-2
title: 文字列の道具
takeaway: "文字列の長さや一部を調べ、加工や条件の組合せに使えます。"
introduces: ["length", "repeat", "toUpperCase", "toLocaleString", "&&"]
requires: ["const", "文字列", "string", "number", "boolean", "メソッド", "引数", "戻り値", "型注釈"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 2-1-2 文字列の道具

<!-- ノート: 文字列の長さや一部を調べ、加工や条件の組合せに使えます。 -->

---

# 商品ラベルを整える

商品コードから、必要な部分だけ印刷したいです。

文字数や取り出す場所は、どう調べるのでしょうか。

<!-- ノート: 身近な仕事の場面から考えます。ここでは答えをまだ言いません。 -->

---

# 覚えること

文字列の長さや一部を調べ、加工や条件の組合せに使えます。

<!-- ノート: length は文字数を表す値で、かっこを付けません。repeat は繰り返し、toUpperCase は大文字化、toLocaleString は地域に応じた表示を作ります。&& は両方が真かを確かめます。 -->

---

# 最小のコード

```ts
// 商品コードを作る
const code = "TKY-0012";
// 先頭の3文字を取り出す
const area = code.slice(0, 3);
```

area は "TKY" です。3番目の文字は入りません。

<!-- ノート: 各行のコメントを読み、何を作って何を入れるかを確かめます。length は文字数を表す値で、かっこを付けません。repeat は繰り返し、toUpperCase は大文字化、toLocaleString は地域に応じた表示を作ります。&& は両方が真かを確かめます。 -->

---

# よくある間違い

code.length() は型のエラーです。

参考: サバイバルTypeScript [型注釈](https://typescriptbook.jp/reference/values-types-variables/type-annotation)。説明と例は教材用に独自作成しています。

<!-- ノート: length は文字数を表す値で、かっこを付けません。repeat は繰り返し、toUpperCase は大文字化、toLocaleString は地域に応じた表示を作ります。&& は両方が真かを確かめます。 問題のテスト値も確かめ、答えの処理は自分で書きます。 -->

---

<!-- _class: summary -->
# まとめ

文字列の長さや一部を調べ、加工や条件の組合せに使えます。

<!-- ノート: 文字列の長さや一部を調べ、加工や条件の組合せに使えます。 -->
