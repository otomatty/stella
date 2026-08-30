---
id: 4-1-4
title: box-sizingで幅の数え方を揃える
takeaway: "box-sizing: border-box にすると、widthがボーダーまで含めた幅になる"
introduces: [box-sizing, border-box]
requires: [幅, padding, ボーダー, プロパティ]
header: "HTML/CSS入門"
---

<!-- _class: lead -->

# 4-1-4
# box-sizingで幅の数え方を揃える

HTML/CSS入門 — Module 4 / レッスン4-1

<!-- ノート: レッスン4-1の最後です。ここを知らないと、余白を足すたびにレイアウトが崩れます。 -->

---

## なぜ必要か

- 幅300pxに指定した箱が、余白を足したら300pxを超えて並びが崩れる
- 計算し直して幅を減らす、を毎回やることになる

<!-- ノート: つかみ。実際に横並びが折り返される画面を見せると伝わる。ここで結論は言わない。 -->

---

## 結論

**box-sizing: border-box にすると、widthがボーダーまで含めた幅になる**

- 既定では `width` は **中身だけ** の幅
- **border-box** にすると、余白と枠を含めた幅になる

<!-- ノート: 結論を言い切る。既定の数え方が直感と違う、という点が全部の原因。 -->

---

## 最小のコード

```css
.card {
  box-sizing: border-box;
  width: 300px;
  padding: 16px;
  border: 1px solid gray;
}
```

- 見た目の幅はちょうど300px
- 中身の幅が自動で調整される

<!-- ノート: border-boxなら、指定した数字が実際の見た目の幅になる。 -->

---

## 数え方の違い

| box-sizing | width 300px の実際の幅 |
| --- | --- |
| 既定 | 300 + padding + border |
| `border-box` | ちょうど 300 |

<!-- ノート: 対比枠。実務では全要素にborder-boxを一括指定するのが定番。まずは使う箱に個別に書けばよい。 -->

---

<!-- _class: summary -->

## まとめ

**box-sizing: border-box にすると、widthがボーダーまで含めた幅になる**

<!-- ノート: 結論の再掲だけ。箱の性質が分かったので、次は並べ方に進む。 -->
