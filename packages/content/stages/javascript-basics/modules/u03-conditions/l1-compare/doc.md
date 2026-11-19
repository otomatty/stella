---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119]
---
# レッスン3-1 比べて分ける

## このレッスンの目標

- [ ] 大小や等しさの比較を、真偽値を返す式で書けます。
- [ ] 条件に応じて返す値を、`if`・`else if`・`else` で選べます。
- [ ] 値が切り替わる境界の前後と、境界ちょうどの値で分岐を確かめられます。

この単元では、数値・文字列・変数・関数の呼び出しと `return` を使います。

## 3-1-1 値を比べる

> **比較演算子は真偽値を返し、等しいかは `===` で確かめます。**

比較演算子は、二つの値を比べる記号です。結果は `true`（成り立つ）か `false`（成り立たない）です。この二つを真偽値と呼びます。

| 比較 | 意味 |
| --- | --- |
| `>` | より大きい |
| `>=` | 以上 |
| `<` | より小さい・未満 |
| `<=` | 以下 |
| `===` | 型を変えずに等しさを調べる |

数値の `12` と文字列の `"12"` は型が違うので、`===` で比べると `false` です。`==` では型を自動で変えて比較する場合があるため、等しさの比較には `===` を使います。

`export` を付けると、この関数を別の JavaScript ファイルから呼び出せます。比較の結果がそのまま必要なら、式を `return` に渡します。

```js
export function matchesProductCode(inputCode, productCode) {
  return inputCode === productCode;
}

console.log(matchesProductCode("P12", "P12")); // => true
console.log(matchesProductCode("P12", "P13")); // => false
```

## 3-1-2 条件で二つに分ける

> **条件が成り立つときの処理を `if` に、成り立たないときの処理を `else` に書きます。**

処理の道筋を条件によって分けることを分岐と呼びます。まず `if` の丸括弧の中にある条件式を読みます。次に、`true` なら `if` の波括弧の中、`false` なら `else` の波括弧の中へ進みます。

```js
export function stockLabel(stock) {
  if (stock > 0) {
    return "購入できます";
  } else {
    return "売り切れ";
  }
}

console.log(stockLabel(2)); // => 購入できます
console.log(stockLabel(0)); // => 売り切れ
```

在庫が 0 個の場合、`stock > 0` は `false` なので「売り切れ」を返します。

## 3-1-3 範囲を上から分ける

> **`else if` で範囲を上から順に分け、境目ちょうどの値で確かめます。**

三つ以上に分けるときは、前の条件が成り立たなかったときに `else if` の条件を調べます。送料の例では、5,000 円以上と 3,000 円以上の両方に当たる注文があります。送料無料の条件を先に書くと、5,000 円の注文は最初の分岐で送料が 0 円になります。

```js
export function shippingFee(total) {
  if (total >= 5000) {
    return 0;
  } else if (total >= 3000) {
    return 300;
  } else {
    return 600;
  }
}

console.log(shippingFee(3000)); // => 300
console.log(shippingFee(5000)); // => 0
```

結果が切り替わる値を境界と呼びます。テストでは、入力と期待する結果をそろえて、実際の結果と照らし合わせます。金額を 1 円単位で扱うなら、境界の直前・ちょうど・直後を確かめます。

| 注文金額 | 期待する送料 |
| --- | --- |
| 2,999 円 | 600 円 |
| 3,000 円、3,001 円 | 300 円 |
| 4,999 円 | 300 円 |
| 5,000 円、5,001 円 | 0 円 |

ちょうどの値が想定と違うときは、`>=` と `>` のどちらが仕様に合うか見直します。高い金額が低い側の送料になるときは、条件を並べた順を確かめます。

## もっと知りたい人へ

- [比較演算子（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators#comparison_operators)
- [等価性の比較（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- [if...else（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else#description)
