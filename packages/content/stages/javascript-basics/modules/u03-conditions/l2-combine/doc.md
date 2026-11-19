---
sourceRefs: [SRC-mdn-js-comparison-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-logical-and-20261119, SRC-mdn-js-logical-or-20261119, SRC-mdn-js-logical-not-20261119, SRC-mdn-js-return-20261119]
---
# レッスン3-2 条件を組み合わせる

## このレッスンの目標

- [ ] 仕様の「かつ」「または」を読み、条件式を `&&` や `||` でつなげます。
- [ ] `!` で条件を反転し、例外に当たる場合に先に値を返せます。

## 3-2-1 条件をつなぐ

> **二つの条件は、どちらも成り立つなら `&&`、少なくともどちらかが成り立つなら `||` でつなぎます。**

通知を送る条件を式にするときは、仕様を一つずつ真偽値にできる条件に分けます。たとえば `isWeekday` は平日なら `true`、`hour >= 18` は 18 時以降なら `true` です。

真偽値を組み合わせる記号を論理演算子と呼びます。論理積 `&&` は両方が `true` のときに `true` になります。論理和 `||` は片方だけが `true` のときも、両方が `true` のときも `true` になります。

```js
export function canSendNotice(isWeekday, hour) {
  return isWeekday || hour >= 18;
}

console.log(canSendNotice(false, 17)); // => false
console.log(canSendNotice(false, 18)); // => true
console.log(canSendNotice(true, 18)); // => true
```

仕様が「平日かつ 18 時以降」に変わったら、同じ二つの条件を `&&` でつなぎます。片方だけが成り立つ入力を試すと、`&&` と `||` の使い分けを確かめられます。

## 3-2-2 例外を先に返す

> **`!` で条件を反転し、例外に当たるときは先に `return` して関数を終えます。**

論理否定 `!` は、真偽値の `true` と `false` を反転します。`isOpen` は窓口が開いているかを表します。`!isOpen` は窓口が閉まっているときに `true` になります。

```js
export function canAcceptRequest(isOpen, slots) {
  if (!isOpen) {
    return false;
  }
  return slots > 0;
}

console.log(canAcceptRequest(false, 3)); // => false
console.log(canAcceptRequest(true, 3)); // => true
console.log(canAcceptRequest(true, 0)); // => false
```

受け付けられないと分かった時点で関数を終える書き方を、早期 return と呼びます。閉まっている場合は最初の `return` で終わるので、空き枠は調べません。通常の処理は `if` の波括弧の外にそろえて書けます。

## もっと知りたい人へ

- [論理積（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND#description)
- [論理和（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR#description)
- [論理否定（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_NOT#description)
- [return（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return#description)
