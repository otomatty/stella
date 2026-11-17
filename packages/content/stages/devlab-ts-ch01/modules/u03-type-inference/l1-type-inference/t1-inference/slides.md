---
sourceRefs: [SRC-typescriptbook-values-types-variables-type-inference]
id: 1-3-1
title: 型が自動で決まる
takeaway: "値や return から型が決まり、戻り値の型注釈を省けます。"
introduces: ["型推論", "export const", "リテラル型", "ユニオン型", "undefined"]
requires: ["const", "let", "再代入", "true", "false", "boolean", "型注釈", "number", "string", "return", "if", "<"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-3-1 型が自動で決まる

<!-- ノート: 値や return から型が決まり、戻り値の型注釈を省けます。 -->

---

# 型を書かない送料

送料を500円と決めて、名前を付けたいです。

型を書くところを省くと、どうなるでしょうか。

<!-- ノート: 身近な仕事の場面から考えます。ここでは答えをまだ言いません。 -->

---

# 覚えること

値や return から型が決まり、戻り値の型注釈を省けます。

<!-- ノート: 型注釈を省いても型は決まっています。関数は return から戻り値の型が決まり、複数の候補は縦棒でまとめられます。undefined は値がないことを表します。 -->

---

# 最小のコード

```ts
// 送料を入れた定数を外から使えるようにする
export const SHIPPING_FEE = 500;
// 店名を入れ直せる変数として作る
let shopName = "本店";
```

型はそれぞれ 500 と string です。

<!-- ノート: 各行のコメントを読み、何を作って何を入れるかを確かめます。型注釈を省いても型は決まっています。関数は return から戻り値の型が決まり、複数の候補は縦棒でまとめられます。undefined は値がないことを表します。 -->

---

# よくある間違い

shopName = 100 は型のエラーです。

参考: サバイバルTypeScript [型推論](https://typescriptbook.jp/reference/values-types-variables/type-inference)。説明と例は教材用に独自作成しています。

<!-- ノート: 型注釈を省いても型は決まっています。関数は return から戻り値の型が決まり、複数の候補は縦棒でまとめられます。undefined は値がないことを表します。 問題のテスト値も確かめ、答えの処理は自分で書きます。 -->

---

<!-- _class: summary -->
# まとめ

値や return から型が決まり、戻り値の型注釈を省けます。

<!-- ノート: 値や return から型が決まり、戻り値の型注釈を省けます。 -->
