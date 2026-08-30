---
id: 3-1-5
title: buttonのtypeを書き分ける
takeaway: "フォームの中のbuttonは、送信ならsubmit、それ以外はtypeをbuttonにする"
introduces: [buttonのtype]
requires: [HTML骨格]
header: "UI部品入門"
---

<!-- _class: lead -->

# 3-1-5
# buttonのtypeを書き分ける

UI部品入門 — Module 3 / レッスン3-1

<!-- ノート: レッスン3-1の最後です。フォームの中のボタンには、書き忘れやすい属性があります。 -->

---

## なぜ必要か

- 「行を追加」を押しただけで、フォームが送信されてしまった
- 原因が分からず、ボタンを押すのが怖くなる

<!-- ノート: つかみ。実際によく起きる不具合で、原因は属性1つです。 -->

---

## 結論

**フォームの中の`button`は、送信なら`submit`、それ以外は`type`を`button`にする**

- `type` を省くと `submit` 扱いになる
- 送信しないボタンには必ず `type="button"`

<!-- ノート: 結論。既定値が submit であることを知っているかどうかで決まります。 -->

---

## 最小のコード

```html
<form action="/contact" method="post">
  <button type="submit">送信する</button>
  <button type="button">入力例を見る</button>
</form>
```

<!-- ノート: 2つ目に type="button" が無いと、押した瞬間に送信されます。 -->

---

## typeの3つの値

| 値 | 何が起きるか |
| --- | --- |
| `submit` | フォームを送信する(既定) |
| `reset` | 入力内容を初期値に戻す |
| `button` | 何も起きない |

<!-- ノート: 対比の枠。reset は入力を消してしまうので、使う場面はほとんどありません。 -->

---

<!-- _class: summary -->

## まとめ

**フォームの中の`button`は、送信なら`submit`、それ以外は`type`を`button`にする**

<!-- ノート: 結論の再掲だけ。次のレッスンで、これらの部品に見た目を当てます。 -->
