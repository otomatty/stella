# レッスン2-3 ページネーション

## このレッスンの目標

- [ ] ページ送りの骨格を `nav` + `ol` で書ける
- [ ] 番号の並べ方と置く位置を 1 行ずつで決められる
- [ ] 押せる大きさをトークンで確保し、現在のページを示せる

## 2-3-1 ページ送りもnavとolで書く

> **ページ送りは、navの中のolに前後と番号のリンクを並べて書く**

一覧が 200 件あるとき、1 ページに全部出すと重くて読めません。何ページかに分けて行き来する部品を **ページネーション** と呼びます。

```html
<nav class="pagination" aria-label="ページ送り">
  <ol>
    <li><a href="?page=2">前へ</a></li>
    <li><a href="?page=1">1</a></li>
    <li><a href="?page=2">2</a></li>
    <li><a href="?page=4">次へ</a></li>
  </ol>
</nav>
```

骨格はパンくずと同じ `nav` + `ol` です。番号には順番があるので `ul` ではなく `ol` を使い、`aria-label` でこのナビの名前を付けます。

中身は `button` ではなく `a` にします。使い分けはこうです。

- `a` … 別のページへ **移動する** 操作
- `button` … そのページの中で **何かを起こす** 操作

ページ送りは移動なので `a` です。`a` にしておくと、中クリックで新しいタブに開けますし、そのページの URL を共有もできます。

## 2-3-2 番号は横並びで置く位置を決める

> **ページ送りの番号はflexで横に並べ、justify-contentで置く位置を決める**

2 段階目のレイアウトです。横に並べる指定と、どこに置くかの指定を 1 行ずつ書きます。

```css
.pagination ol {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  list-style: none;
  padding: 0;
}
```

- `justify-content: center` … 並びを中央に置く。右端なら `flex-end`
- `gap: 4px` … 番号どうしを近づけて、ひとかたまりに見せる
- `flex-wrap: wrap` … ページ数が多いときに折り返す

`margin: 0 auto` で中央に寄せようとして効かなかった経験があるかもしれません。`ol` は既にブロック要素で幅いっぱいなので、中身の位置を決めているのは親の `justify-content` です。**中身の位置は親が決める**と覚えると迷いません。

折り返しを入れておくのは、狭い画面のためです。横スクロールが出るより、2 行に折り返したほうが読めます。

## 2-3-3 押せる大きさをトークンで確保する

> **番号のリンクは、トークンの余白と最小の寸法で押せる大きさを確保する**

3 段階目です。この部品では、トークンが見た目だけでなく **押しやすさ** に直結します。

数字の「1」は文字が細く、そのままでは指で狙いにくい当たり判定になります。「1」と「10」で幅も違うので、並びがガタガタに見えます。

```css
:root {
  --tap-size: 44px;
}

.pagination a,
.pagination [aria-current="page"] {
  display: grid;
  place-items: center;
  min-inline-size: var(--tap-size);
  min-block-size: var(--tap-size);
  border-radius: var(--radius-1);
}
```

- `--tap-size` … 「指で押せる最小の大きさ」という役割のトークン
- `min-inline-size` / `min-block-size` … 下限だけを決める。中身が長ければ広がる
- `place-items: center` … 中身を縦横の中央に置く

文字の大きさに任せず部品側で下限を決めるので、1 桁でも 2 桁でも同じ大きさの升目が並びます。`--tap-size` を 1 か所変えれば、全部の升目がまとめて変わります。

## 2-3-4 現在のページはリンクにしない

> **現在のページはリンクにせず、aria-currentを付けて見た目を反転する**

4 段階目の状態です。ページネーションの状態は「いま何ページ目か」です。

いま 3 ページ目にいるなら、「3」は押せる必要がありません。押しても同じページが再読み込みされるだけです。リンクを外して、印を付けます。

```html
<li><span aria-current="page">3</span></li>
```

```css
.pagination [aria-current="page"] {
  background-color: var(--accent);
  color: var(--surface);
  font-weight: 600;
}
```

パンくずの最後の項目と、まったく同じ考え方です。**押せない場所は押せなくする。現在地は印で伝える。**

背景と文字色を入れ替えると、そこだけ塗りつぶされた見た目になり、ひと目で分かります。ただしこれは色だけの手がかりなので、`aria-current` の印を必ずセットにしてください。印があれば、読み上げでも「現在のページ」と伝わります。

残りのリンクには、これまでどおり状態を付けます。

```css
.pagination a {
  &:hover { background-color: var(--surface-2); }
  &:focus-visible { outline: 2px solid var(--accent); }
}
```

## もっと知りたい人へ

- [Pagination(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Pagination)
- [`justify-content`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/justify-content)
- [`min-inline-size`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/min-inline-size)

---

演習は [practice.md](practice.md) にあります。
