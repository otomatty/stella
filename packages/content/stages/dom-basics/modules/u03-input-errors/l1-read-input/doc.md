---
sourceRefs: [SRC-mdn-dom-input-value-20261119, SRC-mdn-js-trim-20261119, SRC-mdn-js-number-20261119, SRC-mdn-dom-submit-event-20261119, SRC-mdn-dom-prevent-default-20261119]
---
# レッスン3-1 入力を読む

## このレッスンの目標

- [ ] 入力欄の現在の値を文字列として読めます。
- [ ] 使い道に合わせて、前後の空白を除いたり数値に変換したりできます。
- [ ] フォームの送信を受けて、同じ画面で入力内容を確認できます。

この単元では、`querySelector` で要素を取得し、`textContent` で表示を変えます。`addEventListener` でクリック時の処理を登録したときと同じように、送信時の処理も登録できます。JavaScript の条件式は「比較と条件の組合せ」で学んだものを使います。

## 3-1-1 入力欄の値を読む

> **`input.value` は文字列なので、前後の空白は `trim()` で除き、計算には `Number()` で数値に変換します。**

入力欄から読む `value` は、その時点で欄に入っている値です。数字を入力する `type="number"` の欄でも、`12` と表示されていれば `value` は文字列の `"12"` です。次の例では、HTML から `quantity.js` を ES モジュールとして読み込みます。

```html
<label for="quantity">数量</label>
<input id="quantity" type="number" value="12">
<script type="module" src="./quantity.js"></script>
```

```js
const input = document.querySelector("#quantity");
const rawQuantity = input.value;
const quantity = Number(rawQuantity);

console.log(rawQuantity + 1); // => "121"
console.log(quantity + 1);     // => 13
```

文字列の `"12"` に `1` を足すと、文字がつながります。数として計算したいときは `Number(rawQuantity)` で変換してから足します。

名前のような文字列を扱うときは、文字の前後にある空白を `trim()` で除けます。たとえば `"  山田 太郎  ".trim()` は `"山田 太郎"` になります。文字列の途中にある空白と、入力欄に表示されている元の値はそのままです。

数量を入力したかどうかで処理を分けたい場合は、変換前に `trim()` をかけて `""` と比較します。`Number("")` は `0` になるため、変換した値だけを見ると空欄か数値の 0 かを区別できません。数値に変換できない文字列の結果は `NaN`（数値として計算できないことを表す値）です。

## 3-1-2 フォームの送信を受ける

> **フォームの `submit` を受け、`event.preventDefault()` でブラウザーの送信を止めてから値を読みます。**

送信ボタンを押すなどしてフォームを送信すると、フォームに `submit` イベントが届きます。テキスト欄で Enter キーを押して送信した場合も、同じ処理で受け取れます。

次は名前を読み、その場で内容を確認するフォームです。`label` の `for` と入力欄の `id` を同じにすると、入力欄に「名前」というラベルが付きます。

```html
<form id="registration">
  <label for="name">名前</label>
  <input id="name" name="name">
  <button type="submit">確認</button>
</form>
<p id="preview"></p>
<script type="module" src="./preview.js"></script>
```

```js
const form = document.querySelector("#registration");
const nameInput = document.querySelector("#name");
const preview = document.querySelector("#preview");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  preview.textContent = nameInput.value.trim();
});
```

`event` は、起きた操作についてブラウザーから処理に渡される値です。`preventDefault()` を呼ぶと、ブラウザーが通常行うフォーム送信と、それに伴うページ遷移が止まります。そのあとで `value` を読むと、「確認」を押した時点の名前が取り出せます。先に「 佐藤 」と入力して確認し、次に名前を「鈴木」に変えてもう一度確認すると、画面の表示も切り替わります。

## もっと知りたい人へ

- [入力欄の value（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value)
- [trim()（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim#return_value)
- [Number()（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number#return_value)
- [submit イベント（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event#description)
- [preventDefault()（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault#notes)
