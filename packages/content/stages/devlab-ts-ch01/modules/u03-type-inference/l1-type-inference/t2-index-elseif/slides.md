---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 3-1-2
title: 添字と else if
takeaway: "文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。"
introduces: ["添字", "else if", "toFixed"]
requires: ["型推論", "undefined", "let", "const", "string", "number", "if", "<", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 3-1-2 添字と else if

<!-- ノート: 文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。 -->

---

# 注文番号の先頭はどれ？

注文番号の先頭だけを、伝票に載せたいです。

文字の場所には、どんな番号を付けるのでしょうか。

<!-- ノート: 身近な仕事の場面から考えます。ここでは答えをまだ言いません。 -->

---

# 覚えること

文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。

<!-- ノート: else if は前の条件に合わなかった場合だけ確かめます。toFixed は数の表示を指定した桁数の文字列にします。 -->

---

# 最小のコード

```ts
// 注文番号を作る
const orderId = "A-102";
// 先頭の文字を取り出す
const head = orderId[0];
```

head は "A" です。ない位置は undefined です。

<!-- ノート: 各行のコメントを読み、何を作って何を入れるかを確かめます。else if は前の条件に合わなかった場合だけ確かめます。toFixed は数の表示を指定した桁数の文字列にします。 -->

---

# よくある間違い

先頭は [1] ではなく [0] です。

参考: サバイバルTypeScript [型推論](https://typescriptbook.jp/reference/values-types-variables/type-inference)。説明と例は教材用に独自作成しています。

<!-- ノート: else if は前の条件に合わなかった場合だけ確かめます。toFixed は数の表示を指定した桁数の文字列にします。 問題のテスト値も確かめ、答えの処理は自分で書きます。 -->

---

<!-- _class: summary -->
# まとめ

文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。

<!-- ノート: 文字の位置と条件の順番を確かめ、数は桁数を決めて表示できます。 -->
