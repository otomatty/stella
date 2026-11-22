---
sourceRefs: [SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-statements-for-of]
id: 1-2-6
title: 文字列をつないでいく
takeaway: "文字列も += で後ろにつないでいけます。"
introduces: ["文字列の連結"]
requires: ["文字列", "let", "再代入", "+=", "for", ">=", "--", "テンプレートリテラル", "関数", "引数", "export", "number", "string", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-6 文字列をつないでいく

<!-- ノート: 足して入れ直す記号を文字列に使い、後ろにつながる順番を読める。 -->

---

# 糸にビーズを通す

空の糸に、色の違うビーズを通しています。

次のビーズを通すと、どんな順番になるでしょうか。

<!-- ノート: まず、ビーズのない糸を用意します。次のビーズを通すと、どんな順番になるでしょうか。 -->

---

# 覚えること

文字列も += で後ろにつないでいけます。

<!-- ノート: 空の文字列に、右側の文字列を後ろからつなぎます。 -->

---

# プラスイコールで後ろにつなぐ

```ts
// つなぐ先に空の文字列を入れる
let text = "";
// 文字列の後ろに「あ」をつなぐ
text += "あ";
```

<!-- ノート: 空の文字列に、右側の文字列を後ろからつなぎます。 -->

---

# 数を文字列に入れる

テンプレートリテラルの `${i}` に数を入れ、あとに空白を付けます。

参考はサバイバルTypeScriptの[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)です。説明と例は教材用に独自作成しています。

<!-- ノート: 空白も文字列の一部です。最後につないだ数のあとにも残ります。 -->

---

<!-- _class: summary -->
# まとめ

文字列も += で後ろにつないでいけます。

<!-- ノート: 文字列も += で後ろにつないでいけます。 -->
