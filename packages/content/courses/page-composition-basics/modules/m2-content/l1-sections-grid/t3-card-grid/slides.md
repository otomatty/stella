---
id: 2-1-3
title: カードの集合はgridで敷き詰める
takeaway: "カードの集合は、repeat(auto-fill, minmax())のgridで幅に合わせて敷き詰める"
introduces: [カード, grid, auto-fill, "minmax()", メディアクエリー]
requires: [区画, gap, トークン]
header: "ページ構成入門研修"
---

<!-- _class: lead -->

# 2-1-3
# カードの集合はgridで敷き詰める

ページ構成入門研修 — Module 2 / レッスン2-1

<!-- ノート: 部品講座で作ったカードを、いよいよ集合として並べます。この講座の山場の1つです。 -->

---

## なぜ必要か

- カードは1枚ずつ作った。一覧では何枚も並ぶ
- 列の数を3と決め打ちすると、狭い画面で窮屈になる
- 画面の幅に合わせて、列の数が自動で変わってほしい

<!-- ノート: つかみ。カード自身は変えません。並べる入れ物を作る話です。 -->

---

## 結論

**カードの集合は、`repeat(auto-fill, minmax())`の`grid`で幅に合わせて敷き詰める**

- `auto-fill` … 幅に入るだけ列を作る
- `minmax(220px, 1fr)` … 列は最低220px、余りは等分

<!-- ノート: 結論。この1行が「列の数を書かないグリッド」のレシピです。 -->

---

## 最小のコード

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}
```

```html
<div class="card-grid">
  <article class="card">…</article>
  <article class="card">…</article>
</div>
```

<!-- ノート: カードのHTMLとCSSはそのまま。card-gridという入れ物を1枚かぶせるだけです。 -->

---

## 決め打ちの列数との対比

- `repeat(3, 1fr)` … 幅が狭くても3列のまま、カードがつぶれる
- `auto-fill + minmax` … 入らなくなったら列が減り、1列まで畳まれる
- 幅ごとの切り替えを自分で書かなくても、列数が追従する

<!-- ノート: 対比。メディアクエリー無しで列数が変わるのがこのレシピの価値です。 -->

---

<!-- _class: summary -->

## まとめ

**カードの集合は、`repeat(auto-fill, minmax())`の`grid`で幅に合わせて敷き詰める**

<!-- ノート: 結論の再掲だけ。次は、並んだカードの行の高さをそろえる上積みの話です。 -->
