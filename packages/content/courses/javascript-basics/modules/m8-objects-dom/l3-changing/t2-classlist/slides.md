---
id: 8-3-2
title: classListで見た目を切り替える
takeaway: "classListのadd / remove / toggleで、要素のclassを付け外しできる"
introduces: [classList, toggle]
requires: [class, querySelector, CSS, メソッド, addEventListener]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 8-3-2
# classListで見た目を切り替える

JavaScript入門 — Module 8 / レッスン8-3

<!-- ノート: 「見た目の変更はCSSに書き、JSはclassを切り替えるだけ」という実務の分担を教える重要トピックです。 -->

---

## なぜ必要か

- 「完了したタスクは打ち消し線にしたい」
- 色や線の指定はCSSの仕事。JavaScriptで直接書きたくない
- 「どの見た目か」の切り替えだけをJavaScriptが担いたい

<!-- ノート: つかみ。HTML/CSS/JSの分担(0-1-1)が、ここで実装パターンとして完成します。 -->

---

## 結論

**classListのadd / remove / toggleで、要素のclassを付け外しできる**

- **classList** = 要素のclass一覧を扱うプロパティ
- 見た目そのものはCSS側の `.クラス名` に書いておく

<!-- ノート: 結論。addで付け、removeで外し、toggleは「あれば外す・なければ付ける」です。 -->

---

## 最小のコード

```css
.done { text-decoration: line-through; }
```

```js
const item = document.querySelector("li");
item.classList.add("done");     // 打ち消し線が付く
item.classList.remove("done");  // 元に戻る
```

<!-- ノート: CSSとJSの2ファイルの分担を1画面で見せます。JS側に色や線の指定が出てこない点が要点です。 -->

---

## toggleはクリックと相性がいい

```js
item.addEventListener("click", () => {
  item.classList.toggle("done");
});
```

- 押すたびに **toggle** が付け外しを繰り返す

<!-- ノート: 関連枠。完了⇔未完了の切り替えUIが3行で書ける、という到達感を出します。 -->

---

<!-- _class: summary -->

## まとめ

**classListのadd / remove / toggleで、要素のclassを付け外しできる**

<!-- ノート: 再掲のみ。書き換えの次は「要素そのものを増やす」です、と次へ。 -->
