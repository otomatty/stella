---
id: 8-3-3
title: createElementとappendChildで要素を足す
takeaway: "createElementで作った要素は、appendChildで親に差し込むと画面に現れる"
introduces: [createElement, appendChild]
requires: [document, DOM, 要素, textContent, 親要素]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 8-3-3
# createElementとappendChildで要素を足す

JavaScript入門研修 — Module 8 / レッスン8-3

<!-- ノート: DOM操作の山場です。「作る」と「差し込む」の2段階を丁寧に分けます。 -->

---

## なぜ必要か

- 「追加」ボタンで、リストに項目を増やしたい
- HTMLに書いていない要素を、あとから生やす必要がある
- 既存の書き換えだけでは、増やせない

<!-- ノート: つかみ。買い物リスト・チャット・通知など「増える一覧」はすべてこの操作でできています。 -->

---

## 結論

**createElementで作った要素は、appendChildで親に差し込むと画面に現れる**

- **createElement**(タグ名) — 新しい要素を作る(まだ画面には無い)
- 親要素.**appendChild**(要素) — 親の末尾に差し込む

<!-- ノート: 結論。「作っただけでは見えない」が最大のポイント。関数の定義と呼び出しの関係に似ています。 -->

---

## 最小のコード

```js
const list = document.querySelector("ul");
const item = document.createElement("li");
item.textContent = "新しいタスク";
list.appendChild(item);
```

<!-- ノート: 作る→中身を入れる→差し込む、の3拍子。この3行のリズムはこの後もずっと使います。 -->

---

## 2段階である理由

- 作ってから差し込むまでの間に、中身や見た目を整えられる
- 未完成の要素が画面にチラつかない
- 差し込んだ瞬間に、DOMツリーの一員として描画される

<!-- ノート: 関連枠。組み立ててから店頭に並べる、という例えが通じやすいです。 -->

---

<!-- _class: summary -->

## まとめ

**createElementで作った要素は、appendChildで親に差し込むと画面に現れる**

<!-- ノート: 再掲のみ。増やせたなら消すのも要る、と次へ。 -->
