---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-statements-for-of, SRC-typescriptbook-statements-if-else, SRC-typescriptbook-values-types-variables-string]
id: 1-1-7
title: 1 文字ずつ見る
takeaway: "for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。"
introduces: ["for-of", "if", "===", ".includes()", "メソッド", "文字列の連結"]
requires: ["const", "let", "再代入", "+=", "++", "true", "false", "文字列", "テンプレートリテラル", "関数", "代入"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-7 1 文字ずつ見る

<!-- ノート: for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。 -->

---

# 仕事の中のくり返し

注文番号の文字ごとに、区切りを付けたいです。

先頭から一文字ずつ、どう取り出すのでしょうか。

<!-- ノート: 身近な仕事での問いを示します。ここでは答えのコードをまだ示しません。 -->

---

# 覚えること

for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。

<!-- ノート: c は一周ごとに新しく作るので const で書きます。空の文字列では一度もくり返しません。値の後ろに点を付けて呼ぶ関数をメソッドと呼びます。 -->

---

# 値を追ってみる

```ts
// 注文番号 AB から 1 文字ずつ c に取り出してくり返す
for (const c of "AB") {
  // 取り出した文字を表示する
  console.log(c);
}
```

A、B の順に表示します。

<!-- ノート: c は一周ごとに新しく作るので const で書きます。空の文字列では一度もくり返しません。値の後ろに点を付けて呼ぶ関数をメソッドと呼びます。 -->

---

# 条件と、つなぐ順番

`if` は条件に合うときだけ実行します。
`===` は等しいか、`.includes()` は含むかを調べます。

比較に `=` を一つ書くのは間違いです。
文字列の `+` は左からつなぐので、前に足す文字を左に置きます。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)・[if-else文](https://typescriptbook.jp/reference/statements/if-else)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)。説明と例は教材用に独自作成しています。

<!-- ノート: c は一周ごとに新しく作るので const で書きます。空の文字列では一度もくり返しません。値の後ろに点を付けて呼ぶ関数をメソッドと呼びます。 問題の関数の形とテストで確かめる値を読み、自分で中身を書きます。 -->

---

<!-- _class: summary -->
# まとめ

for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。

<!-- ノート: for-of で文字を取り出し、条件を調べたり、つなぐ順を変えたりできます。 -->
