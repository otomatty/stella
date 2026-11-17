---
sourceRefs: [SRC-typescriptbook-values-types-variables-number, SRC-typescriptbook-values-types-variables-let-and-const]
id: 1-1-3
title: 割り算と切り上げ
takeaway: "割り算の結果を Math.ceil に渡すと、大きい側の整数へ切り上げられます。"
introduces: ["割り算", "Math.ceil"]
requires: ["const", "Math.floor"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-1-3 割り算と切り上げ

<!-- ノート: 割り算と切り上げを、コードと値の動きで確かめます。 -->

---

# 箱はいくつ必要？

25 本の商品を、12 本入りの箱に詰めます。

全部入れるには、何箱必要でしょうか。

<!-- ノート: 2 箱に収まるか、割った結果をどう扱うかを問いにします。 -->

---

# 覚えること

割り算の結果を Math.ceil に渡すと、大きい側の整数へ切り上げられます。

割り算は `/` で書き、割り切れないと小数になります。

<!-- ノート: 25 を12で割ると約2.08です。数直線では2と3の間です。Math.ceil は大きい側の3へ、Math.floor は小さい側の2へ進みます。整数はそのままです。 -->

---

# 書き方を読む

```ts
// 箱の数 boxes を作り、25 を 12 で割って切り上げる
const boxes = Math.ceil(25 / 12);
```

<!-- ノート: 25 を12で割ると約2.08です。数直線では2と3の間です。Math.ceil は大きい側の3へ、Math.floor は小さい側の2へ進みます。整数はそのままです。 -->

---

# よくある間違い

`800 + 400 / 2` は `1000` です。

割り算が先です。先に足すときは、合計を名前に入れてから割ります。

参考: [サバイバルTypeScript: number型](https://typescriptbook.jp/reference/values-types-variables/number)。説明と例は教材用に独自作成しています。

<!-- ノート: 送料込みの金額を2人で払うなら、800と400を先に足し、その1200を2で割ると600です。問2は100円単位の切り上げ、問4は合計を先に作ってから割る練習です。 -->

---

<!-- _class: summary -->
# まとめ

割り算の結果を Math.ceil に渡すと、大きい側の整数へ切り上げられます。

<!-- ノート: 割り算の結果を Math.ceil に渡すと、大きい側の整数へ切り上げられます。 -->
