---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 2-1-7
title: 文字数を調べる
takeaway: "文字列.length で、文字数が分かります。かっこは付けません。"
introduces: ["length"]
requires: ["const", "文字列", "number", "メソッド"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 2-1-7 文字数を調べる

<!-- ノート: この動画では、文字数を調べる方法を学びます。 -->

---

# 入力欄の長さを確かめる

投稿欄には、入力できる文字の上限があります。いま入力されている文字は、いくつあるでしょうか。

<!-- ノート: パスワードの欄に、文字を入れました。 もう一文字入れると、表示も増えました。 -->

---

# 覚えること

文字列.length で、文字数が分かります。かっこは付けません。

<!-- ノート: 文字の数を持っているのが、length です。 文字数を読むだけなので、かっこは要りません。 -->

---

# 文字数を調べる

```ts
// 注文番号を用意する
const orderCode = "XP7486";
// 注文番号の文字数を数える
const orderSize = orderCode.length;
```

<!-- ノート: 注文番号の長さを調べましょう。この番号は、英字と数字を合わせて六文字です。文字数を、orderSize に入れます。 -->

---

# かっこを付けるとエラーになる

`.length` から得られるのは数値です。メソッドのように `.length()` と書くと、数値を呼び出そうとしてエラーになります。

参考資料は[サバイバルTypeScript: string型 (string)](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: `.length` から得られるのは数値です。メソッドのように `.length()` と書くと、数値を呼び出そうとしてエラーになります。 -->

---

<!-- _class: summary -->
# まとめ

文字列.length で、文字数が分かります。かっこは付けません。

<!-- ノート: 文字列.length で、文字数が分かります。かっこは付けません。 -->
