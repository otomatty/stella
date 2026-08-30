---
id: 8-3-5
title: 入力欄の値はvalueで読む
takeaway: "入力欄のいまの中身は、要素.valueで文字列として取れる"
introduces: [value, 入力欄]
requires: [querySelector, 文字列, Number, フォーム, submit, preventDefault]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 8-3-5
# 入力欄の値はvalueで読む

JavaScript入門 — Module 8 / レッスン8-3

<!-- ノート: 講座最後の新トピックです。これで買い物リストの部品がすべてそろいます。 -->

---

## なぜ必要か

- 利用者がタイプした内容を、プログラムで受け取りたい
- 追加ボタンの処理は「入力欄のいまの中身」が材料になる
- textContentでは入力欄の中身は取れない

<!-- ノート: つかみ。ここまでのDOM操作は「出す」ばかりでした。最後は「受け取る」です。 -->

---

## 結論

**入力欄のいまの中身は、要素.valueで文字列として取れる**

- **入力欄**(input)の中身は **value** プロパティにある
- 型は常に文字列。数の計算にはNumber()を通す

<!-- ノート: 結論。1-2-4の「入力は文字列で届く」の伏線がここで回収されます。 -->

---

## 最小のコード

```html
<form><input><button>追加</button></form>
<script>
  const input = document.querySelector("input");
  const form = document.querySelector("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log(input.value);
  });
</script>
```

<!-- ノート: フォーム+submit+preventDefault(7-2-4)の組み合わせ。入力してEnterでもボタンでも同じsubmitが起きる点が実務的です。 -->

---

## 読み書きと後片付け

```js
console.log(input.value);  // 読む
input.value = "";          // 空にして次の入力に備える
```

- 追加処理の最後に空へ戻すのが定番の後片付け

<!-- ノート: 関連枠。valueへの代入は書き換えです。追加→クリアの流れは次の総仕上げでそのまま使います。 -->

---

<!-- _class: summary -->

## まとめ

**入力欄のいまの中身は、要素.valueで文字列として取れる**

<!-- ノート: 再掲のみ。部品が全部そろったので、演習で買い物リストを組み上げます、と講座の締めへ向かいます。 -->
