---
id: 8-3-1
title: textContentで文字を変える
takeaway: "要素.textContentに代入すると、表示される文字が変わる"
introduces: [textContent]
requires: [querySelector, 代入, 文字列, DOM, プロパティ]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 8-3-1
# textContentで文字を変える

JavaScript入門 — Module 8 / レッスン8-3

<!-- ノート: 初めて「画面が変わる」トピックです。console.logからの卒業になります。 -->

---

## なぜ必要か

- ここまでの結果表示は、ずっとコンソールだった
- 利用者はコンソールを開かない。画面に出したい
- 要素の中の文字を、コードから書き換えたい

<!-- ノート: つかみ。「利用者に見えるところへ」という当たり前のゴールにようやく到達します。 -->

---

## 結論

**要素.textContentに代入すると、表示される文字が変わる**

- **textContent** = 要素が持つ「中の文字」のプロパティ
- 読むことも、代入で書き換えることもできる

<!-- ノート: 結論。オブジェクトのプロパティ読み書き(8-1-2)がそのまま要素にも通じます。 -->

---

## 最小のコード

```html
<p class="message">未保存です</p>
<script>
  const message = document.querySelector(".message");
  message.textContent = "保存しました";
</script>
```

- 画面の文字がその場で変わる

<!-- ノート: 開いた瞬間に書き換わるので一瞬ですが、これが「DOMを変えると画面が変わる」の最小体験です。 -->

---

## 読むこともできる

```js
console.log(message.textContent);  // => "保存しました"
```

- 似た道具にinnerHTMLがあるが、文字を入れるならtextContentを使う
- (innerHTMLはHTMLとして解釈され、危険な混入の入り口になる)

<!-- ノート: 対比枠。利用者入力をinnerHTMLに入れるのがXSSの典型、という話は「危ないから文字はtextContent」の一言に圧縮します。 -->

---

<!-- _class: summary -->

## まとめ

**要素.textContentに代入すると、表示される文字が変わる**

<!-- ノート: 再掲のみ。文字の次は見た目の切り替えです、と次へ。 -->
