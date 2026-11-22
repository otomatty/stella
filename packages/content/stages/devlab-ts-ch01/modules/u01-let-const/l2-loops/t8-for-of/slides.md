---
sourceRefs: [SRC-typescriptbook-statements-for-of, SRC-typescriptbook-values-types-variables-string]
id: 1-2-8
title: 1文字ずつ取り出す
takeaway: "for-of は、文字列から 1 文字ずつ取り出してくり返します。"
introduces: ["for-of"]
requires: ["const", "変数", "文字列", "let", "++"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-8 1文字ずつ取り出す

<!-- ノート: フォーオブで文字列を読むとき、取り出す順番と回数を言える。 -->

---

# 文字のカードを取る

「ねこ」の文字を一枚ずつカードに書き、横に並べました。

左から順に手に取ると、何が見えるでしょうか。

<!-- ノート: 文字列を、横に並んだカードで考えます。左から順に手に取ると、何が見えるでしょうか。 -->

---

# 覚えること

for-of は、文字列から 1 文字ずつ取り出してくり返します。

<!-- ノート: `of` の右の文字列から一文字を取り出し、その回の `c` に入れます。 -->

---

# for-of で取り出す

```ts
// 「ねこ」から一文字ずつ取り出す
for (const c of "ねこ") {
  // 取り出した文字を表示する
  console.log(c);
}
```

<!-- ノート: `of` の右の文字列から一文字を取り出し、その回の `c` に入れます。 -->

---

# 取り出す順番

`"ねこ"` → `"ね"`、`"こ"` の順です。空なら一度もくり返しません。

参考はサバイバルTypeScriptの[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)です。説明と例は教材用に独自作成しています。

<!-- ノート: 一周ごとに変数を作るので、取り出す文字の名前には const を使えます。 -->

---

<!-- _class: summary -->
# まとめ

for-of は、文字列から 1 文字ずつ取り出してくり返します。

<!-- ノート: for-of は、文字列から 1 文字ずつ取り出してくり返します。 -->
