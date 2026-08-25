---
id: 3-1-2
title: 余った高さはmainの1frに渡す
takeaway: "bodyを縦のgridにしてmainの行を1frにすると、余った高さをmainが受け取りfooterが下端に付く"
introduces: [grid-template-rows, fr]
requires: [footer, main, header, grid, min-height, 骨格]
header: "ページ構成入門研修"
---

<!-- _class: lead -->

# 3-1-2
# 余った高さはmainの1frに渡す

ページ構成入門研修 — Module 3 / レッスン3-1

<!-- ノート: 前のトピックで作った「余り」を配って、フッタを下端に付けます。 -->

---

## なぜ必要か

- `body`は画面の高さまで伸びたのに、フッタはまだ浮いている
- 伸びたのは`body`だけで、中の3つは中身のぶんのまま
- 余った高さを **誰に渡すか** を決めていない

<!-- ノート: つかみ。余りはできたが配っていない、という状態を言葉にします。 -->

---

## 結論

**`body`を縦の`grid`にして`main`の行を`1fr`にすると、余った高さを`main`が受け取り`footer`が下端に付く**

- `fr`は「余りを配る」単位。カードの列で使ったものの行版
- 渡す相手は本文の`main`。ヘッダとフッタは中身のぶんのまま

<!-- ノート: 結論。骨格が3つだからこそ、行3つのgridがそのまま使えます。 -->

---

## 最小のコード

```css
body {
  min-height: 100svh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}
```

<!-- ノート: 行はheader・main・footerの3つ。autoは中身のぶん、1frが余りを全部受け取ります。 -->

---

## marginで押し下げない

- `footer { margin-block-start: auto }` でも似たことはできる
- ただし`body`の子の構成が変わると効き方が変わりやすい
- 骨格3行のgridは「どの行が余りを受けるか」が読んで分かる

<!-- ノート: 対比。レシピとして覚えるのはgrid版です。行の定義に意図が残るのが利点です。 -->

---

<!-- _class: summary -->

## まとめ

**`body`を縦の`grid`にして`main`の行を`1fr`にすると、余った高さを`main`が受け取り`footer`が下端に付く**

<!-- ノート: 結論の再掲だけ。下端はこれで完成。次は重ねて出す部品をページに載せます。 -->
