---
sourceRefs: [SRC-mdn-aria-invalid-20261119, SRC-mdn-aria-describedby-20261119]
id: 3-2-2
title: 入力欄にエラーを結ぶ
takeaway: "エラー文を入力欄のそばに表示し、`aria-describedby` で結んで `aria-invalid=\"true\"` で状態を伝えます。"
introduces: [aria-describedby, aria-invalid, setAttribute]
requires: [value, submit, preventDefault, 検証関数, エラー文]
header: "DOMと画面操作"
---
<!-- _class: lead -->
# 3-2-2 入力欄にエラーを結ぶ

<!-- ノート: 今回のテーマは「入力欄にエラーを結ぶ」です。 -->
---
# どの欄を直せばよいか伝える

登録フォームで「入力に誤りがあります」とだけ出ると、直す欄を探すことになります。名前欄をどう直せばよいか、その場で分かるようにしましょう。

<!-- ノート: 入力欄のそばに直し方を出し、画面の内容を読み上げるソフトウェアにも説明の関連を伝えます。 -->
---
# 覚えること

エラー文を入力欄のそばに表示し、`aria-describedby` で結んで `aria-invalid="true"` で状態を伝えます。

<!-- ノート: エラー文を入力欄のそばに表示し、aria-describedby で結んで aria-invalid="true" で状態を伝えます。 -->
---
# 説明の場所と状態を指定する

```html
<label for="name">名前</label>
<input id="name" aria-describedby="name-error">
<p id="name-error"></p>
```

```js
// 検証関数がエラー文を返したとき
nameError.textContent = message;
nameInput.setAttribute("aria-invalid", "true");
```

<!-- ノート: label の for は入力欄の id を指し、入力欄に名前を付けます。aria-describedby は説明を置く要素の id を指します。setAttribute で aria-invalid を true にすると、その欄の入力が無効であることが伝わります。 -->
---
# 名前と説明は別の場所に置く

`for="name"` は「名前」というラベルと入力欄を結びます。`aria-describedby="name-error"` は「名前を入力してください。」という説明と入力欄を結びます。

<!-- ノート: 入力欄と説明を見た目で近くに置き、id でも結び付けます。ラベルが示すのは何を入れる欄かで、エラー文が示すのはどう直すかです。 -->
---
<!-- _class: summary -->
# まとめ

エラー文を入力欄のそばに表示し、`aria-describedby` で結んで `aria-invalid="true"` で状態を伝えます。

<!-- ノート: エラー文を入力欄のそばに表示し、aria-describedby で結んで aria-invalid="true" で状態を伝えます。 -->
