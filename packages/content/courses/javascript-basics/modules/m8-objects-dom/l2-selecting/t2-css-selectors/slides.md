---
id: 8-2-2
title: querySelectorはCSSのセレクターで選ぶ
takeaway: "querySelectorには、classやidなどCSSと同じセレクターが書ける"
introduces: [class, id]
requires: [querySelector, セレクター, DOM, CSS, タグ]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 8-2-2
# querySelectorはCSSのセレクターで選ぶ

JavaScript入門研修 — Module 8 / レッスン8-2

<!-- ノート: M7ではタグ名だけでしたが、CSSで学んだセレクターがフルに使えることを明かします。 -->

---

## なぜ必要か

- ボタンが2つあるページで `querySelector("button")` は最初の1つしか取れない
- 「保存ボタンだけ」を狙って取りたい
- CSSで学んだ「狙い撃ちの記法」をここでも使いたい

<!-- ノート: つかみ。タグ名だけでは足りなくなる、という自然な限界から入ります。 -->

---

## 結論

**querySelectorには、classやidなどCSSと同じセレクターが書ける**

- **class** 属性は `.名前`、**id** 属性は `#名前` で選ぶ
- CSSに書けるセレクターは、ほぼそのまま使える

<!-- ノート: 結論。HTML/CSS入門で学んだclass/idの記法が、JavaScriptでもそのまま通じます。 -->

---

## 最小のコード

```html
<button class="save">保存</button>
<button class="cancel">取消</button>
<script>
  const saveButton = document.querySelector(".save");
</script>
```

<!-- ノート: .saveで2つのうち保存だけが取れます。#はidが1つしか無い要素向け、と使い分けも一言。 -->

---

## この講座はquerySelectorに統一

- `getElementById` など、古くからの取得方法も存在する
- 書き分けを覚えるより、セレクター1本の方が迷わない
- CSSと同じ頭で選べるのも利点

<!-- ノート: 対比枠。古いコードでgetElementByIdを見たら「#と同じ意味」と読めれば十分です。 -->

---

<!-- _class: summary -->

## まとめ

**querySelectorには、classやidなどCSSと同じセレクターが書ける**

<!-- ノート: 再掲のみ。「1つ」ではなく「全部」ほしいときは?を次に残します。 -->
