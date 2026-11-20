---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
id: 1-1-2a
title: 計算した結果を入れる
takeaway: "イコールの右側が先に計算され、その結果が変数に入ります。"
introduces: ["式", "足し算"]
requires: ["const", "変数", "代入"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-2a 計算した結果を入れる

<!-- ノート: 計算した結果を入れるを、身近な例とコードで確かめます。 -->

---

# 合計はいくら？

本の値段は 1200 円、送料は 500 円です。

合計の金額にも、名前を付けられるのでしょうか。

<!-- ノート: 値に名前を付ける書き方は、前のトピックで見ました。ここでは、計算した結果に名前を付けます。答えはまだ言いません。 -->

---

# 覚えること

イコールの右側が先に計算され、その結果が変数に入ります。

変数に入るのは、式ではなく計算の結果です。

<!-- ノート: 1200 + 500 のような計算の書き方を式と呼びます。イコールの右側の式が先に計算され、結果の 1700 が total に入ります。total は合計という意味の英語です。 -->

---

# 右側を計算して、左の変数へ

```ts
// 合計 total を作り、1200 と 500 を足した結果を入れる
const total = 1200 + 500;
```

<!-- ノート: 1200 + 500 のような計算の書き方を式と呼びます。イコールの右側の式が先に計算され、結果の 1700 が total に入ります。total は合計という意味の英語です。 -->

---

# 変数どうしも足せる

`price + shipping` のように、変数を式に書けます。

price が `1200`、shipping が `500` なら、結果は `1700` です。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: 式に変数を書くと、その中身の値で計算されます。先に計算が済んでから、結果が左の変数に入ります。 -->

---

<!-- _class: summary -->
# まとめ

イコールの右側が先に計算され、その結果が変数に入ります。

<!-- ノート: イコールの右側が先に計算され、その結果が変数に入ります。 -->
