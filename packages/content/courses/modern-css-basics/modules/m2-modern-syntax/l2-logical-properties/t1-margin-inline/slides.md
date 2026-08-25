---
id: 2-2-1
title: 余白は流れの向きで書ける
takeaway: "margin-inlineは、文章が流れる向きを基準に左右の余白をまとめて指定する"
introduces: [論理プロパティ, margin-inline]
requires: []
header: "モダンCSS入門研修"
---

<!-- _class: lead -->

# 2-2-1
# 余白は流れの向きで書ける

モダンCSS入門研修 — Module 2 / レッスン2-2

<!-- ノート: このレッスンは、上下左右の代わりに「文章の流れる向き」で書く新しい語彙です。 -->

---

## なぜ必要か

- `margin-left` と `margin-right` に同じ値を2行書くことが多い
- 縦書きや右から書く言語では、「左」が文の先頭とは限らない

<!-- ノート: つかみ。物理的な上下左右は、書字方向が変わると意味がずれます。 -->

---

## 結論

**`margin-inline`は、文章が流れる向きを基準に左右の余白をまとめて指定する**

- 流れの向きで書くプロパティを **論理プロパティ** と呼ぶ
- inline = 文字が進む向き(日本語の横書きなら左右)

<!-- ノート: 結論。「左右」ではなく「文の進む向きの両端」と捉え直します。 -->

---

## 最小のコード

```css
.container {
  margin-inline: auto;
}

.title {
  margin-block: 24px;
}
```

- `margin-block` = 行が積み重なる向き(横書きなら上下)

<!-- ノート: margin-inline: auto は入門の margin: 0 auto と同じ中央寄せが1語で書けます。 -->

---

## 対応表

| 従来(横書き) | 論理プロパティ |
| --- | --- |
| margin-left / right | margin-inline |
| margin-top / bottom | margin-block |
| padding-left / right | padding-inline |

<!-- ノート: 図解代わりの対応表。paddingにも同じ形があります。2行が1行になるのが日々の利点です。 -->

---

<!-- _class: summary -->

## まとめ

**`margin-inline`は、文章が流れる向きを基準に左右の余白をまとめて指定する**

<!-- ノート: 結論の再掲だけ。次は幅と高さの論理版です。 -->
