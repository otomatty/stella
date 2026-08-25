---
id: 4-5-2
title: position absoluteは基準の箱に重ねる
takeaway: "position: absoluteは通常フローから抜け、relativeを持つ先祖を基準に置かれる"
introduces: [absolute, 重なり]
requires: [position, relative, 通常フロー, 親要素, ボックス, 入れ子]
header: "HTML/CSS入門研修"
---

<!-- _class: lead -->

# 4-5-2
# position absoluteは基準の箱に重ねる

HTML/CSS入門研修 — Module 4 / レッスン4-5

<!-- ノート: relative は「場所を残して動く」でした。absolute は場所ごと抜けます。 -->

---

## なぜ必要か

- カードの右上に「新着」のラベルを重ねたい
- 流れに沿って置くかぎり、他の要素の上には乗せられない

<!-- ノート: つかみ。バッジやリボンは重ねないと作れない。ここで結論は言わない。 -->

---

## 結論

**position: absoluteは通常フローから抜け、relativeを持つ先祖を基準に置かれる**

- 元の場所は空かない。周りは詰めて並び直す
- **重なり** ができるので、他の要素の上に乗る

<!-- ノート: 結論を言い切る。基準の決まり方が最大のつまずきどころなので、次で図解する。 -->

---

## 最小のコード

```html
<div class="card">
  <span class="badge">新着</span>
</div>
```

```css
.card { position: relative; }
.badge { position: absolute; top: 8px; right: 8px; }
```

<!-- ノート: 基準にしたい親に relative、重ねたい子に absolute。この2行がセット。 -->

---

## 基準を書き忘れると

- 親に `position: relative` が無いと、基準がページ全体になる
- カードの右上ではなく、画面の右上に飛んでいく

<!-- ノート: 失敗例の枠。absolute が思わぬ場所に行ったら、まず親の relative を疑う。 -->

---

<!-- _class: summary -->

## まとめ

**position: absoluteは通常フローから抜け、relativeを持つ先祖を基準に置かれる**

<!-- ノート: 結論の再掲だけ。次は、文章に画像を回り込ませる古くからの指定に触れる。 -->
