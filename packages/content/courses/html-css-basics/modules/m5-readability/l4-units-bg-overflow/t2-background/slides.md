---
id: 5-4-2
title: 背景の画像はsizeで収め方を決める
takeaway: "background-imageで敷いた画像は、background-sizeで収め方を決める"
introduces: [background-image, background-size, cover]
requires: [background-color, 画像, プロパティ, 値, 相対パス, ボックス, 幅, 高さ]
header: "HTML/CSS入門研修"
---

<!-- _class: lead -->

# 5-4-2
# 背景の画像はsizeで収め方を決める

HTML/CSS入門研修 — Module 5 / レッスン5-4

<!-- ノート: 背景色は 5-1-3 で扱いました。ここは背景の画像です。 -->

---

## なぜ必要か

- 見出しの後ろに写真を敷きたい
- `img` で置くと、文字の背面に敷くだけでも位置の調整が要る

<!-- ノート: つかみ。飾りの画像は背景、内容の画像は img、という分担につながる。 -->

---

## 結論

**background-imageで敷いた画像は、background-sizeで収め方を決める**

- **background-image** = 箱の背景に画像を敷くプロパティ
- 敷いただけでは、繰り返されたり切れたりする

<!-- ノート: 結論を言い切る。size を書かないと元の大きさのまま並ぶ。 -->

---

## 最小のコード

```css
.hero {
  background-image: url("images/venue.png");
  background-size: cover;
  height: 240px;
}
```

- **cover** = 箱を埋めるように拡大・縮小する

<!-- ノート: url() の中は相対パス。高さを決めないと、中身のぶんしか領域がない点も補う。 -->

---

## 背景か、内容か

| 画像の役割 | 置き方 |
| --- | --- |
| 内容を伝える(地図・製品写真) | `img` と `alt` |
| 飾り(見出しの後ろの模様) | 背景 |

<!-- ノート: 対比枠。ここが本題。背景の画像は読み上げに出ないので、内容を入れてはいけない。 -->

---

<!-- _class: summary -->

## まとめ

**background-imageで敷いた画像は、background-sizeで収め方を決める**

<!-- ノート: 結論の再掲だけ。最後に、箱に収まらない中身の扱いに進む。 -->
