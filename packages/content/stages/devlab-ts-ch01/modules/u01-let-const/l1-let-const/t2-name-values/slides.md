---
sourceRefs: [SRC-typescriptbook-values-types-variables-let-and-const, SRC-typescriptbook-values-types-variables-number]
id: 1-1-2
title: 値に名前を付ける
takeaway: "const で変数を作ると、値に名前が付き、その名前で値を使えます。"
introduces: ["const", "変数", "代入", "Math.floor"]
requires: []
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-2 値に名前を付ける

<!-- ノート: 値に名前を付け、計算に使う書き方を見ます。動画は空のコード枠から文字と値の動きを見せます。 -->

---

# 税込でいくら？

1000 円の本を買います。税は価格の 10% です。

価格と税額を、コードではどう表すのでしょうか。

<!-- ノート: 価格や送料を扱う仕事でも、何の金額か分かる名前があると計算を読みやすくなります。ここでは税込の答えをまだ書きません。 -->

---

# 覚えること

const で変数を作ると、値に名前が付き、その名前で値を使えます。

名前で値を使えるようにしたものを「変数」と呼びます。

<!-- ノート: const は値に名前を付ける書き方です。値を名前に入れることを代入と呼びます。const で作った名前には、あとから別の値を入れ直せません。 -->

---

# 右側を計算して、左の名前へ

```ts
// 価格 price を作り、1200 を入れる
const price = 1200;
// 送料を足した合計 total を作る
const total = price + 500;
```

`1200 + 500` が先に計算され、`total` に `1700` が入ります。

<!-- ノート: price には価格を入れます。名前は中身が分かるように付けます。イコールは等しいという意味ではなく、右の値を左の名前に入れる印です。掛け算は * で書き、price * 3 は 3600 になります。 -->

---

# 小数点以下を切り捨てる

```ts
// 100 円ごとのポイント数を作る
const points = Math.floor(1980 / 100);
```

`1980 / 100` → `19.8` → `Math.floor` → `19`

四捨五入ではないので、`20` にはなりません。

参考: サバイバルTypeScript [letとconst](https://typescriptbook.jp/reference/values-types-variables/let-and-const)・[number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: 割り算は / で書きます。まず割り算をしてから、Math.floor で小数点以下を切り捨てます。問1では税込の金額を返します。1000 円は 1100 円、980 円は 1078 円です。5 円では税の 0.5 円を切り捨てるので、5 円のままです。答えのコードは自分で書いてみましょう。 -->

---

<!-- _class: summary -->
# まとめ

const で変数を作ると、値に名前が付き、その名前で値を使えます。

<!-- ノート: const で変数を作ると、値に名前が付き、その名前で値を使えます。 -->
