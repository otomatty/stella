---
id: 8-3-4
title: removeで要素を消す
takeaway: "要素.remove()を呼ぶと、その要素はページから消える"
introduces: [remove]
requires: [要素, querySelector, メソッド, DOM, event.target]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 8-3-4
# removeで要素を消す

JavaScript入門研修 — Module 8 / レッスン8-3

<!-- ノート: 削除です。委譲と組み合わせた「押した項目を消す」までを見せます。 -->

---

## なぜ必要か

- 終わったタスクをリストから消したい
- 閉じるボタンで通知を消したい
- 「増やす」の対になる操作が要る

<!-- ノート: つかみ。増える一覧は、消せなければすぐあふれます。 -->

---

## 結論

**要素.remove()を呼ぶと、その要素はページから消える**

- 要素自身の **remove** メソッドを呼ぶだけ
- DOMツリーから外れ、描画からも消える

<!-- ノート: 結論。classList.removeとは別物(あちらはclassを外す、こちらは要素ごと消す)という名前の衝突に注意します。 -->

---

## 最小のコード

```js
const notice = document.querySelector(".notice");
notice.remove();
```

<!-- ノート: 2行で消えます。再読み込みすれば戻る(HTMLファイルは変わっていない)ことも確認します。 -->

---

## 委譲と組み合わせる

```js
const list = document.querySelector("ul");
list.addEventListener("click", (event) => {
  if (event.target === list) {
    return;  // ulの余白のクリックは無視
  }
  event.target.remove();
});
```

- 押したliだけが消える。あとから増えた項目にも効く

<!-- ノート: 関連枠。7-2の委譲+event.targetがここで実を結びます。ガードが無いと、ulの余白を押したときevent.targetがul自身になり、リストごと消えてしまいます。早期リターン(6-2-2)の実戦投入でもあります。 -->

---

<!-- _class: summary -->

## まとめ

**要素.remove()を呼ぶと、その要素はページから消える**

<!-- ノート: 再掲のみ。最後の部品「入力欄の中身」へ、と次に進みます。 -->
