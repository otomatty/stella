---
id: 2-2-5
title: formでひとまとまりにして送る
takeaway: "1回で送りたい入力欄はformで囲み、中のbuttonが送る部品になる"
introduces: [form, action, name, 送信]
requires: [入力欄, input, ボタン, button, 属性, 属性値, label]
header: "HTML/CSS入門"
---

<!-- _class: lead -->

# 2-2-5
# formでひとまとまりにして送る

HTML/CSS入門 — Module 2 / レッスン2-2

<!-- ノート: 欄とボタンが揃いました。最後に、それらを1つの申込としてまとめます。 -->

---

## なぜ必要か

- 欄とボタンを並べただけでは、どの欄が1回の申込に含まれるのか決まらない
- ボタンを押しても、入力した内容がどこにも渡らない

<!-- ノート: つかみ。見た目は完成しているのに動かない、という状態。ここで結論は言わない。 -->

---

## 結論

**1回で送りたい入力欄はformで囲み、中のbuttonが送る部品になる**

- **form** = 1回の送信で扱う入力欄のまとまり
- **action** = 入力内容の送り先

<!-- ノート: 結論を言い切る。button は「押せる部品」であり、form の中では「送る部品」になる。 -->

---

## 最小のコード

```html
<form action="/apply">
  <label for="applicant">お名前</label>
  <input type="text" id="applicant" name="applicant" />
  <button>送信する</button>
</form>
```

- `form` の中の `button` は、押すと **送信** の合図になる
- **name** = 送られるときの、その欄の項目名

<!-- ノート: name を書いた欄だけが送られる。id は結び付け用で、送信には使われない。 -->

---

## 囲み忘れが起こすこと

```html
<label for="applicant">お名前</label>
<input type="text" id="applicant" name="applicant" />
<button>送信する</button>
```

- `form` が無いので、押しても何も送られない
- `name` があっても、送る単位が決まっていないと届かない

<!-- ノート: 失敗例の枠。見た目は同じ。動かないときはまず form があるかを見る。 -->

---

<!-- _class: summary -->

## まとめ

**1回で送りたい入力欄はformで囲み、中のbuttonが送る部品になる**

<!-- ノート: 結論の再掲だけ。送られた内容をどう扱うかはこの講座の範囲外、と一言添える。 -->
