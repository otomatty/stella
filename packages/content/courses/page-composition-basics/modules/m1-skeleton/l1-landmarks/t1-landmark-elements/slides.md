---
id: 1-1-1
title: ページはlandmarkで組む
takeaway: "1枚のページの骨格は、header・nav・main・footerというlandmarkになる要素で組む"
introduces: [ページ, 骨格, 部品, landmark, header, nav, main, footer]
requires: []
header: "ページ構成入門"
---

<!-- _class: lead -->

# 1-1-1
# ページはlandmarkで組む

ページ構成入門 — Module 1 / レッスン1-1

<!-- ノート: この講座の1本目です。部品はもう作ってあるので、ここからは1枚のページに組み立てていきます。 -->

---

## なぜ必要か

- カードもナビもフォームも、部品は手元にそろっている
- でも部品をbodyへ並べただけでは、どこが本文でどこがナビか決まらない
- 置き場所の骨組みを、最初に決めたい

<!-- ノート: つかみ。部品の作り方は前の講座で終わっています。この講座の主役は配置です。 -->

---

## 結論

**1枚のページの骨格は、`header`・`nav`・`main`・`footer`というlandmarkになる要素で組む**

- ページの大きな領域を表す要素を **landmark**(目印)と呼ぶ
- 読み上げソフトはlandmarkの一覧からページ内を移動できる

<!-- ノート: 結論。見た目のためではなく、機械にも領域の地図が渡るのがポイントです。 -->

---

## 最小のコード

```html
<body>
  <header>
    <nav>…サイト内の移動…</nav>
  </header>
  <main>…このページの本文…</main>
  <footer>…連絡先や著作権表示…</footer>
</body>
```

<!-- ノート: navはheaderの中に置きます。headerは上の帯、mainは本文、footerは下の帯。この4つが骨格です。 -->

---

## ページの骨格

![w:820](assets/page-landmarks.svg)

<!-- ノート: 図解枠。上からheader・main・footerの3段で、navはheaderの中に置く。mainだけがそのページ固有の中身で、1ページに1つ。各要素の役割はまとめの資料に一覧がある。 -->

---

<!-- _class: summary -->

## まとめ

**1枚のページの骨格は、`header`・`nav`・`main`・`footer`というlandmarkになる要素で組む**

<!-- ノート: 結論の再掲だけ。次は、landmarkをいくつ置くかの話をします。 -->
