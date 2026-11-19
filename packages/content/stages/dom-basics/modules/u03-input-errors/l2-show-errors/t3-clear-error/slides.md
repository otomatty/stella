---
sourceRefs: [SRC-mdn-dom-input-event-20261119, SRC-mdn-aria-invalid-20261119, SRC-mdn-aria-describedby-20261119]
id: 3-2-3
title: 直したらエラーを消す
takeaway: "`input` イベントで再検証し、問題がなくなったらエラー文と `aria-invalid` を消します。"
introduces: [input イベント, removeAttribute]
requires: [value, 検証関数, エラー文, aria-invalid]
header: "DOMと画面操作"
---
<!-- _class: lead -->
# 3-2-3 直したらエラーを消す

<!-- ノート: 今回のテーマは「直したらエラーを消す」です。 -->
---
# 名前を入れたあともエラーが残る

「名前を入力してください。」と出たので「佐藤」と入力しました。古いエラーが残っていると、利用者は入力が受け付けられたか判断できません。

<!-- ノート: 送信のときに出したエラーを、利用者が入力し直したときにも見直しましょう。 -->
---
# 覚えること

`input` イベントで再検証し、問題がなくなったらエラー文と `aria-invalid` を消します。

<!-- ノート: input イベントで再検証し、問題がなくなったらエラー文と aria-invalid を消します。 -->
---
# 値が直ったら二つを消す

```js
nameInput.addEventListener("input", () => {
  if (validateName(nameInput.value) !== "") return;
  nameError.textContent = "";
  nameInput.removeAttribute("aria-invalid");
});
```

<!-- ノート: input は、文字を入力したり消したりして、欄の値を編集したときのイベントです。表示中のエラーを見直す処理の中心部分です。空白だけならエラーが残り、有効な名前になったら文を空にして属性を取り除きます。 -->
---
# 変更後の値で判断する

空白を足しただけならエラーを残します。「佐藤」と入力したら、エラー文を空にして `aria-invalid` を取り除きます。

<!-- ノート: 入力操作があったことと、入力が有効になったことは別です。検証関数に最新の値を渡して、その結果で表示を更新します。 -->
---
<!-- _class: summary -->
# まとめ

`input` イベントで再検証し、問題がなくなったらエラー文と `aria-invalid` を消します。

<!-- ノート: input イベントで再検証し、問題がなくなったらエラー文と aria-invalid を消します。 -->
