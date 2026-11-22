---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const]
id: 1-2-1
title: 入れ直せる変数
progressRevision: 2
takeaway: "let で作った変数は、あとから値を入れ直せます。"
introduces: ["let", "再代入"]
requires: ["const", "変数", "代入", "足し算", "関数", "引数", "型注釈", "number", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-1 入れ直せる変数

<!-- ノート: let で作った変数を読んで、入れ直したあとの値を言える。 -->

---

# 得点を書き直す

試合が始まったとき、得点板には 0 点と書いてあります。

点が入ったら、得点板のどこを書き直すでしょうか。

<!-- ノート: 試合の始めは、得点をゼロにします。点が入ったら、得点板のどこを書き直すでしょうか。 -->

---

# 覚えること

let で作った変数は、あとから値を入れ直せます。

<!-- ノート: 最初の行には let を付けます。値を入れ直す行は、変数名から書きます。 -->

---

# let で作り、値を入れ直す

```ts
// 得点を入れ直せる変数として作る
let score = 0;
// 得点に新しい値を入れ直す
score = 3;
```

<!-- ノート: 最初の行には let を付けます。値を入れ直す行は、変数名から書きます。 -->

---

# const で作ると

`const` で作った変数に値を入れ直すと、型のエラーになります。

参考はサバイバルTypeScriptの[letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)です。説明と例は教材用に独自作成しています。

<!-- ノート: 入れ直す必要がある変数だけを let で作ります。 -->

---

<!-- _class: summary -->
# まとめ

let で作った変数は、あとから値を入れ直せます。

<!-- ノート: let で作った変数は、あとから値を入れ直せます。 -->
