---
id: 4-5-1
title: position relativeは元の位置からずらす
takeaway: "position: relativeを指定すると、場所を保ったまま元の位置からずらせる"
introduces: [通常フロー, position, relative]
requires: [ボックス, ブロック, プロパティ, 値, margin]
header: "HTML/CSS入門研修"
---

<!-- _class: lead -->

# 4-5-1
# position relativeは元の位置からずらす

HTML/CSS入門研修 — Module 4 / レッスン4-5

<!-- ノート: ここまでは「流れに沿って並べる」話でした。ここからは流れを外れる置き方です。 -->

---

## なぜ必要か

- アイコンを数px下げたいだけなのに、`margin` で動かすと隣もずれる
- 「ここだけ微調整」ができないと、細部が詰められない

<!-- ノート: つかみ。margin は周りを押しのける。押しのけずに動かしたい。ここで結論は言わない。 -->

---

## 結論

**position: relativeを指定すると、場所を保ったまま元の位置からずらせる**

- **通常フロー** = 書いた順に上から積まれていく、既定の並び
- 元の場所は空けたまま、見た目だけがずれる

<!-- ノート: 結論を言い切る。「場所は残る」がこの指定の要点。 -->

---

## 最小のコード

```css
.badge {
  position: relative;
  top: 4px;
  left: 8px;
}
```

- `top` は上辺からのずらし幅。増やすと下へ動く

<!-- ノート: top/left/right/bottom はその辺からのずらし幅。top を増やすと下へ、left を増やすと右へ動く。right/bottom は向きが逆になるので、まずは top と left の2つで足りる。 -->

---

## marginとの違い

| 指定 | 周りへの影響 |
| --- | --- |
| `margin` | 隣を押しのけて、周りも動く |
| `position: relative` | 元の場所はそのまま。自分だけ動く |

<!-- ノート: 対比枠。ここが本題。微調整は relative、間隔の設計は margin。 -->

---

<!-- _class: summary -->

## まとめ

**position: relativeを指定すると、場所を保ったまま元の位置からずらせる**

<!-- ノート: 結論の再掲だけ。次は、流れから完全に抜ける置き方に進む。 -->
