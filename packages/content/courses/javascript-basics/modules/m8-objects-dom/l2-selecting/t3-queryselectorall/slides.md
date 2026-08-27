---
id: 8-2-3
title: querySelectorAllで全部取る
takeaway: "querySelectorAllは、当てはまる要素すべてをまとめて返す"
introduces: [querySelectorAll, NodeList]
requires: [querySelector, セレクター, for...of, 配列, class]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 8-2-3
# querySelectorAllで全部取る

JavaScript入門研修 — Module 8 / レッスン8-2

<!-- ノート: 複数取得です。for...ofで回せることを示せば、既習の道具がすべてつながります。 -->

---

## なぜ必要か

- リストの項目「全部」に同じ処理をしたい
- querySelectorは最初の1つしか返さない
- 「当てはまる全部」をもらって、ループで回したい

<!-- ノート: つかみ。1つ取るか全部取るか、はDOM操作の基本の分かれ道です。 -->

---

## 結論

**querySelectorAllは、当てはまる要素すべてをまとめて返す**

- 返ってくるのは **NodeList** という「要素の集まり」
- 配列と同じように、for...ofで回せる

<!-- ノート: 結論。NodeListは配列そのものではないが、lengthとfor...ofは同じ感覚で使える、という粒度で伝えます。 -->

---

## 最小のコード

```html
<li class="task">見積作成</li>
<li class="task">レビュー</li>
<script>
  const items = document.querySelectorAll(".task");
  console.log(items.length);  // => 2
</script>
```

<!-- ノート: lengthで個数が見えるので、取れているかの確認がまずできます。 -->

---

## for...ofで全部に触る

```js
for (const item of items) {
  console.log(item);
}
```

- 1件ずつはquerySelectorで取った要素と同じように扱える

<!-- ノート: 関連枠。「全部に付ける」より、前レッスンの委譲(親に1つ)が向く場面も多い、と設計の選択肢を思い出させます。 -->

---

<!-- _class: summary -->

## まとめ

**querySelectorAllは、当てはまる要素すべてをまとめて返す**

<!-- ノート: 再掲のみ。取れるようになったので、次のレッスンでいよいよ書き換えます。 -->
