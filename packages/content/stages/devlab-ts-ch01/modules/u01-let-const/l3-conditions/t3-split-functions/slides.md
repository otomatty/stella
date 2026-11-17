---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-functions-function-declaration]
id: 1-1-10
title: 関数を分けて使う
takeaway: "小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。"
introduces: ["アロー関数", "=>", ".padStart()", "-"]
requires: ["const", "let", "関数", "引数", "戻り値", "number", "文字列", "String()", "メソッド", "テンプレートリテラル", "for", "<"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-10 関数を分けて使う

<!-- ノート: 小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。 -->

---

# 仕事で使う場面

注文番号の先頭を埋める処理を、何度も使うには？

<!-- ノート: 身近な問いを示し、答えはまだ言いません。 -->

---

# 覚えること

小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。

<!-- ノート: 小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。 -->

---

# 書き方を読む

```ts
// 関数 toYen を作る。price を受け取り、円を付けて返す
const toYen = (price: number) => `${price}円`;
// 表示 label を作り、500 を渡した結果を入れる
const label = toYen(500);
```

<!-- ノート: 各行の役割を日本語のコメントで確かめ、値を追います。 -->

---

# 値を順番につなぐ

`String(42).padStart(5, "0")` は `"00042"` です。
数値には直接 `.padStart()` を使えません。
`3000 - 1200` は 1800。計算した値を次の関数に渡せます。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)・[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[関数宣言](https://typescriptbook.jp/reference/functions/function-declaration)。概念を参照し、説明と例は教材用に独自作成しています。

<!-- ノート: アロー関数は関数の短い書き方です。式が一つなら波かっこと return を省けます。=> と >= を取り違えないようにします。 -->

---

<!-- _class: summary -->
# まとめ

小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。

<!-- ノート: 小さな関数に名前を付けて呼ぶと、計算や整形を順番に組み立てられます。 -->
