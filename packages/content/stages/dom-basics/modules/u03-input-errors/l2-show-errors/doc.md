---
sourceRefs: [SRC-mdn-js-trim-20261119, SRC-mdn-js-equality-20261119, SRC-mdn-js-if-else-20261119, SRC-mdn-js-return-20261119, SRC-mdn-aria-invalid-20261119, SRC-mdn-aria-describedby-20261119, SRC-mdn-dom-input-event-20261119, SRC-mdn-dom-submit-event-20261119, SRC-mdn-dom-prevent-default-20261119]
---
# レッスン3-2 エラーを伝える

## このレッスンの目標

- [ ] 入力の検証を、エラー文か空文字を返す関数に分けられます。
- [ ] エラー文を入力欄の近くに出し、HTML の属性で入力欄と結び付けられます。
- [ ] 利用者が入力を直したら再検証し、エラーの表示と属性を消せます。

## 3-2-1 検証を関数に分ける

> **検証関数は値を受け取り、直すことがあればエラー文を、問題がなければ空文字を返します。**

検証とは、入力が決められたルールを満たすか調べることです。登録フォームで名前を必須とするなら、「前後の空白を除いた値が空かどうか」で判定できます。条件に応じて値を返す書き方は、「比較と条件の組合せ」で使ったものと同じです。

```js
// validators.js
export function validateName(name) {
  if (name.trim() !== "") {
    return "";
  }
  return "名前を入力してください。";
}
```

`!==` は型を変えずに、二つの値が等しくないかを調べます。この例では、空でなければすぐに `return ""` します。空なら最後まで進み、利用者がどう直せばよいかを伝える文を返します。

関数は文字列だけを受け取り、画面の要素には触れません。そのため、フォームを開かずに戻り値をテストできます。

| 渡す値 | 期待する戻り値 |
| --- | --- |
| `""` | `"名前を入力してください。"` |
| `"   "` | `"名前を入力してください。"` |
| `" 佐藤 "` | `""` |

## 3-2-2 入力欄にエラーを結ぶ

> **エラー文を入力欄のそばに表示し、`aria-describedby` で結んで `aria-invalid="true"` で状態を伝えます。**

エラー文は、どの欄をどう直すか分かる場所に出します。名前欄の直後に `<p id="name-error">` を置き、その `id` を入力欄の `aria-describedby` に書きます。読み上げソフトなどの支援技術も、文をその欄の説明として扱えます。

```html
<form id="registration">
  <label for="name">名前</label>
  <input id="name" name="name" aria-describedby="name-error">
  <p id="name-error"></p>
  <button type="submit">確認</button>
</form>
<script type="module" src="./registration.js"></script>
```

`label` の `for` は入力欄の `id` を指し、入力欄の名前を示します。`aria-describedby` が指すのは、説明を置く要素の `id` です。

送信時に検証して、問題があるときは `textContent` でエラー文を表示します。`setAttribute` は属性に値を設定するメソッドです。これを使って `aria-invalid="true"` を設定し、入力が無効であることを支援技術に伝えます。

次の2行は、検証関数が空でないエラー文を返したときの処理です。`nameError` は説明用の段落、`nameInput` は名前欄です。

```js
nameError.textContent = message;
nameInput.setAttribute("aria-invalid", "true");
```

送信するたびに同じ段落の文を置き換えるので、エラー文が重なって増えることもありません。

## 3-2-3 直したらエラーを消す

> **`input` イベントで再検証し、問題がなくなったらエラー文と `aria-invalid` を消します。**

利用者が文字を入力したり消したりして値を変えると、入力欄に `input` イベントが届きます。すでにエラーが出ていれば、変更された値を同じ検証関数に渡します。初めて入力している最中は、エラーを出さずに入力を続けられるようにします。

送信時の検証と入力時の再検証を、次のように `registration.js` に書きます。どちらも、検証関数の戻り値を `showNameError` に渡します。`removeAttribute` は、指定した属性を取り除くメソッドです。

```js
// registration.js
import { validateName } from "./validators.js";

const form = document.querySelector("#registration");
const nameInput = document.querySelector("#name");
const nameError = document.querySelector("#name-error");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showNameError(validateName(nameInput.value));
});

function showNameError(message) {
  nameError.textContent = message;
  if (message !== "") {
    nameInput.setAttribute("aria-invalid", "true");
  } else {
    nameInput.removeAttribute("aria-invalid");
  }
}

nameInput.addEventListener("input", () => {
  if (nameError.textContent === "") {
    return;
  }
  showNameError(validateName(nameInput.value));
});
```

空欄で「確認」を押すとエラーが出ます。空白を足しただけなら検証結果は変わりません。「佐藤」と入力すると、`showNameError` が文を空にして `aria-invalid` を取り除きます。`aria-describedby` は説明欄との結び付きなので、そのままにします。もう一度空欄にして「確認」を押すと、同じ場所にエラーが表示されます。

## もっと知りたい人へ

- [trim()（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim#return_value)
- [等価性の比較（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- [if...else（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else#description)
- [return（MDN）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return#description)
- [aria-describedby（MDN）](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby#description)
- [aria-invalid（MDN）](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid#description)
- [submit イベント（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event#description)
- [preventDefault()（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault#notes)
- [input イベント（MDN）](https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event#description)
