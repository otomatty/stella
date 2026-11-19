---
sourceRefs: [SRC-mdn-dom-submit-event-20261119, SRC-mdn-dom-prevent-default-20261119, SRC-mdn-dom-input-value-20261119, SRC-mdn-js-trim-20261119]
id: 3-1-2
title: フォームの送信を受ける
takeaway: "フォームの `submit` を受け、`event.preventDefault()` でブラウザーの送信を止めてから値を読みます。"
introduces: [submit, preventDefault]
requires: [value, trim]
header: "DOMと画面操作"
---
<!-- _class: lead -->
# 3-1-2 フォームの送信を受ける

<!-- ノート: 今回のテーマは「フォームの送信を受ける」です。 -->
---
# 同じ画面で入力内容を確認する

登録フォームで「確認」を押したあと、同じ画面に入力内容を表示したいとします。フォームのどこで操作を受け取ればよいでしょうか。

<!-- ノート: 確認処理をどの要素に登録すると、フォームを送信する操作をまとめて扱えるでしょうか。 -->
---
# 覚えること

フォームの `submit` を受け、`event.preventDefault()` でブラウザーの送信を止めてから値を読みます。

<!-- ノート: フォームの submit を受け、event.preventDefault() でブラウザーの送信を止めてから値を読みます。 -->
---
# 送信をフォームで受け取る

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  preview.textContent = nameInput.value.trim();
});
```

<!-- ノート: form は登録フォーム、nameInput は名前欄、preview は確認表示の要素です。event は起きた操作についてブラウザーから渡される値です。preventDefault を呼ぶと、ブラウザーが通常行うフォーム送信と、それに伴う画面遷移を止められます。 -->
---
# Enter キーでの送信も受ける

送信ボタンや Enter キーでフォームが送信されると、フォーム自身に `submit` が届きます。

<!-- ノート: Enter キーで送信した場合も、フォームに登録した同じ処理が名前欄の現在値を読みます。 -->
---
<!-- _class: summary -->
# まとめ

フォームの `submit` を受け、`event.preventDefault()` でブラウザーの送信を止めてから値を読みます。

<!-- ノート: フォームの submit を受け、event.preventDefault() でブラウザーの送信を止めてから値を読みます。 -->
