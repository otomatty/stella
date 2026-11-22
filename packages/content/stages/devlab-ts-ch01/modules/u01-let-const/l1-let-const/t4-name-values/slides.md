---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
id: 1-1-4
title: 値に名前を付ける
takeaway: "const で変数を作ると、値に名前が付き、その名前で値を使えます。"
introduces: ["const", "変数", "代入"]
requires: []
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-4 値に名前を付ける

<!-- ノート: 値に名前を付ける書き方を、身近な例とコードで確かめます。 -->

---

# この 500 は何の数？

コードに、500 とだけ書いてあります。

何の数なのか、あとで読んで分かるでしょうか。

<!-- ノート: 価格や送料を扱う仕事では、数だけが並ぶと意味が分からなくなります。ここでは、数に名前を付ける方法を見ます。答えはまだ言いません。 -->

---

# 覚えること

const で変数を作ると、値に名前が付き、その名前で値を使えます。

変数は、名前を付けた値の入れ物です。

<!-- ノート: const は変数を作る印です。その後ろに自分で考えた名前を書き、イコールの右に入れる値を書きます。値を変数に入れることを代入と呼びます。 -->

---

# const で変数を作る

```ts
// 送料 shipping を作り、500 を入れる
const shipping = 500;
```

`shipping` という名前で、`500` を使えるようになります。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: const は変数を作る印です。shipping は送料という意味の英語で、自分で付けた名前です。イコールは等しいという意味ではなく、右の値を左の変数に入れる印です。最後のセミコロンは文の終わりを表します。 -->

---

<!-- _class: summary -->
# まとめ

const で変数を作ると、値に名前が付き、その名前で値を使えます。

<!-- ノート: const で変数を作ると、値に名前が付き、その名前で値を使えます。 -->
