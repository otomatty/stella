---
sourceRefs: [SRC-typescriptbook-statements-if-else, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-values-types-variables-boolean]
id: 1-2-9
title: 合うときだけ数える
takeaway: "if と === で、条件に合うときだけ処理できます。"
introduces: ["if", "===", "メソッド", ".includes()"]
requires: ["const", "再代入", "let", "true", "false", "for-of", "++", "文字列", "関数", "引数", "export", "string", "number", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-9 合うときだけ数える

<!-- ノート: イフと等しいかを調べる記号を読み、数が増える回を見分けられる。 -->

---

# かごからりんごを数える

かごに、りんごやみかんが入っています。

一つずつ取り出して、りんごの個数をどう数えるでしょうか。

<!-- ノート: かごから、果物を一つ取ります。一つずつ取り出して、りんごの個数をどう数えるでしょうか。 -->

---

# 覚えること

if と === で、条件に合うときだけ処理できます。

<!-- ノート: 先に文字と個数の変数を用意します。条件が成り立つときだけ個数を増やします。 -->

---

# 等しいときだけ中身を実行する

```ts
// 取り出した文字がエーと等しいか調べる
if (c === "a") {
  // 合うときに個数を一つ増やす
  count++;
}
```

<!-- ノート: 先に文字と個数の変数を用意します。条件が成り立つときだけ個数を増やします。 -->

---

# 条件を確かめる

`c` が `"a"` なら `true` になり、中身を実行します。別の文字なら `false` になり、中身を飛ばします。

参考はサバイバルTypeScriptの[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[boolean型](https://typescriptbook.jp/reference/values-types-variables/boolean)です。説明と例は教材用に独自作成しています。

<!-- ノート: 右の値を左に入れるときはイコール一つ、等しいか調べるときは三つです。 -->

---

<!-- _class: summary -->
# まとめ

if と === で、条件に合うときだけ処理できます。

<!-- ノート: if と === で、条件に合うときだけ処理できます。 -->
