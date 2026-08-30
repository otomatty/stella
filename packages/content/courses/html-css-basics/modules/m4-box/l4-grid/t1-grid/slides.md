---
id: 4-4-1
title: display gridは格子に並べる
takeaway: "親にdisplay: gridとgrid-template-columnsを書くと、子が決めた列数の格子に並ぶ"
introduces: [グリッド, grid, grid-template-columns]
requires: [display, 親要素, 子要素, 列, 行, flex, gap]
header: "HTML/CSS入門"
---

<!-- _class: lead -->

# 4-4-1
# display gridは格子に並べる

HTML/CSS入門 — Module 4 / レッスン4-4

<!-- ノート: Flex は1方向でした。ここからは縦横をまとめて決める仕組みに入ります。 -->

---

## なぜ必要か

- カードを「3列 × 2行」できれいに並べたい
- Flexで折り返すと、行ごとの列の位置がそろわないことがある

<!-- ノート: つかみ。折り返しは「収まったところで改行」なので、格子にはならない。ここで結論は言わない。 -->

---

## 結論

**親にdisplay: gridとgrid-template-columnsを書くと、子が決めた列数の格子に並ぶ**

- **グリッド** = 行と列であらかじめ区切った格子
- 列を先に決めてから、子を流し込む

<!-- ノート: 結論を言い切る。Flex は「並べた結果」、Grid は「先に枠を決める」。 -->

---

## 最小のコード

```css
.grid {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  gap: 16px;
}
```

- 値を3つ並べたので3列。子は左上から順に入る

<!-- ノート: 4つ目の子は自動で次の行へ。行は数を指定しなくても必要なだけ作られる。 -->

---

## Flexとの違い

| 仕組み | 決め方 |
| --- | --- |
| Flex | 1方向に並べ、収まらなければ縮む・折り返す |
| Grid | 先に列を決め、その枠に流し込む |

<!-- ノート: 対比枠。ここが本題。「並びが揃ってほしい」なら Grid、と選び方を渡す。 -->

---

<!-- _class: summary -->

## まとめ

**親にdisplay: gridとgrid-template-columnsを書くと、子が決めた列数の格子に並ぶ**

<!-- ノート: 結論の再掲だけ。ただし px で決め打つと画面幅に合わない、と次へ引く。 -->
