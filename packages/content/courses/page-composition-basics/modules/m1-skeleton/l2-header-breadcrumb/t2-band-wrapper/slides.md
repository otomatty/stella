---
id: 1-2-2
title: 帯は全幅、中身はwrapper
takeaway: "headerの帯は全幅に伸ばし、中身はwrapperで本文と同じ幅の中央にそろえる"
introduces: [帯, wrapper]
requires: [header, main, トークン, ページ]
header: "ページ構成入門"
---

<!-- _class: lead -->

# 1-2-2
# 帯は全幅、中身はwrapper

ページ構成入門 — Module 1 / レッスン1-2

<!-- ノート: ヘッダの見た目の定番、全幅の帯と幅のそろった中身を作ります。 -->

---

## なぜ必要か

- ヘッダの背景は画面の端から端まで塗りたい
- でもナビや本文が端に張り付くと読みにくい
- 「背景は全幅、中身は決まった幅」を両立したい

<!-- ノート: つかみ。実在のサイトのヘッダはほぼ全部この作りです。 -->

---

## 結論

**`header`の帯は全幅に伸ばし、中身は`wrapper`で本文と同じ幅の中央にそろえる**

- 全幅の背景を **帯**、幅をそろえる囲みを **wrapper** と呼ぶ
- wrapperを`header`と`main`で使い回すと、縦のラインがそろう

<!-- ノート: 結論。塗るのは外側、幅を決めるのは内側、と役割を分けます。 -->

---

## 最小のコード

```css
header {
  background-color: var(--surface-2);
  border-block-end: 1px solid var(--line);
}

.wrapper {
  max-inline-size: 960px;
  margin-inline: auto;
  padding-inline: var(--space-3);
}
```

<!-- ノート: headerは塗るだけ。wrapperは上限幅と左右autoの中央寄せ、端の逃げのpadding。この3行が中身の幅の正体です。 -->

---

## HTMLでの入れ子

```html
<header>
  <div class="wrapper">
    <nav class="site-nav">…</nav>
  </div>
</header>
<main>
  <div class="wrapper">…本文…</div>
</main>
```

<!-- ノート: 帯の直下にwrapperを1枚はさむ、が型です。mainにも同じwrapperを使うので、ナビと本文の左端がそろいます。 -->

---

<!-- _class: summary -->

## まとめ

**`header`の帯は全幅に伸ばし、中身は`wrapper`で本文と同じ幅の中央にそろえる**

<!-- ノート: 結論の再掲だけ。次は、本文の先頭に置く現在地の道しるべです。 -->
