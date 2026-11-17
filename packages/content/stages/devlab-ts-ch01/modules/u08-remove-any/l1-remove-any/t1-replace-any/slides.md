---
sourceRefs: [SRC-typescriptbook-values-types-variables-any]
id: 8-1-1
title: any をなくす
takeaway: "any を具体的な型に直すと、値の使い方の間違いを見つけられます。"
introduces: ["any", "プロパティ", "Number()", "配列", "number[]"]
requires: ["型注釈", "number", "string", "boolean", "length", "const", "メソッド", "toFixed", "for-of", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 8-1-1 any をなくす

<!-- ノート: any はどんな値でもよい型です。具体的な型に直すと名前の誤りにも気付けます。プロパティは点の右の名前です。Number は数値に変えます。number[] は数値の配列で、length は要素の数です。 -->

---

# 仕事で確かめたいこと

型の確認を通ったのに、送料の表示が止まりました。どこを確かめますか。

<!-- ノート: 身近な困りごとから考えます。答えはまだ示さず、書き方を使って確かめます。 -->

---

# 覚えること

any を具体的な型に直すと、値の使い方の間違いを見つけられます。

<!-- ノート: any はどんな値でもよい型です。具体的な型に直すと名前の誤りにも気付けます。プロパティは点の右の名前です。Number は数値に変えます。number[] は数値の配列で、length は要素の数です。 -->

---

# 書き方を見る

```ts
// 個数 quantity を作り、入力を数値にする
const quantity = Number("120");
```

<!-- ノート: any はどんな値でもよい型です。具体的な型に直すと名前の誤りにも気付けます。プロパティは点の右の名前です。Number は数値に変えます。number[] は数値の配列で、length は要素の数です。 -->

---

# よくある間違い

文字列の `length` は読み取り専用です。`code.length = 8` はエラーになります。

参考: サバイバルTypeScript [any](https://typescriptbook.jp/reference/values-types-variables/any)。説明・業務例・知識問題は教材用に構成しています。

<!-- ノート: 問題の答えを写すのではなく、使う値に合う書き方を選びます。 -->

---

<!-- _class: summary -->
# まとめ

any を具体的な型に直すと、値の使い方の間違いを見つけられます。

<!-- ノート: any を具体的な型に直すと、値の使い方の間違いを見つけられます。 -->
