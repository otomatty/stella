---
sourceRefs: [SRC-mdn-dom-input-value-20261119, SRC-mdn-js-trim-20261119, SRC-mdn-js-number-20261119]
id: 3-1-1
title: 入力欄の値を読む
takeaway: "`input.value` は文字列なので、前後の空白は `trim()` で除き、計算には `Number()` で数値に変換します。"
introduces: [value, trim, Number]
requires: []
header: "DOMと画面操作"
---
<!-- _class: lead -->
# 3-1-1 入力欄の値を読む

<!-- ノート: 今回のテーマは「入力欄の値を読む」です。 -->
---
# 入力した数量で小計を出す

注文画面で数量を「12」に変えました。数量を使って計算するには、画面からどんな値を受け取るのでしょうか。

<!-- ノート: 数字が見えている入力欄から、JavaScript にどんな型の値が届くか考えてみましょう。 -->
---
# 覚えること

`input.value` は文字列なので、前後の空白は `trim()` で除き、計算には `Number()` で数値に変換します。

<!-- ノート: input.value は文字列なので、前後の空白は trim() で除き、計算には Number() で数値に変換します。 -->
---
# 数量を文字列で受け取る

```html
<label for="quantity">数量</label>
<input id="quantity" type="number" value="12">
<script type="module" src="./quantity.js"></script>
```

```js
const input = document.querySelector("#quantity");
const rawQuantity = input.value;             // "12"
const quantity = Number(rawQuantity.trim()); // 12
console.log(quantity + 1);                    // => 13
```

<!-- ノート: quantity.js では、数量欄の現在値を value で読みます。type が number の入力欄でも、読み取る値は文字列です。trim で文字列の前後の空白を除き、Number に渡して数値に変えます。 -->
---
# 空欄も文字列で届く

`input.value` が `""` のとき、`Number("")` は `0` になります。未入力を区別するには、変換前に空文字か確かめます。

<!-- ノート: 空欄と 0 を別々に扱う仕様なら、変換前の文字列を確かめます。空白だけの文字列も trim を通すと空文字になります。 -->
---
<!-- _class: summary -->
# まとめ

`input.value` は文字列なので、前後の空白は `trim()` で除き、計算には `Number()` で数値に変換します。

<!-- ノート: input.value は文字列なので、前後の空白は trim() で除き、計算には Number() で数値に変換します。 -->
