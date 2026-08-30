# レッスン2-2 パンくずリスト

## このレッスンの目標

- [ ] パンくずの骨格を `nav` + `ol` で書ける
- [ ] 区切り記号を `::after` で足せる
- [ ] 現在地を `aria-current` で示し、属性セレクタで選べる

## 2-2-1 パンくずは順番のあるol

> **パンくずリストは、上の階層から順にnavの中のolで並べる**

検索から直接ページに入ってきた人には、そのページがサイトのどこにあるのか分かりません。現在位置までの道のりを示す帯を **パンくずリスト** と呼びます。

```html
<nav class="breadcrumb" aria-label="パンくず">
  <ol>
    <li><a href="/">ホーム</a></li>
    <li><a href="/courses">研修一覧</a></li>
    <li>UI部品 入門</li>
  </ol>
</nav>
```

前のレッスンの主要メニューとの違いは 2 つあります。

1. **`ul` ではなく `ol`** … 上の階層から順に並ぶので、順番に意味があります
2. **最後の項目をリンクにしない** … 最後はいま見ているページです。押しても同じページに来るだけなので、`a` で包みません

`aria-label="パンくず"` は、このナビの名前です。1 つのページに `nav` が複数あるとき、読み上げソフトは「ナビゲーション」としか言えません。名前を付けておくと呼び分けられます。

## 2-2-2 区切り記号は::afterで足す

> **パンくずの区切り記号は文字として書かず、::afterで表示だけ足す**

項目の間には `/` や `>` の区切り記号を置きます。このとき、HTML に直接書くのは避けます。

```html
<!-- 飾りの記号が道のりの文字に混ざっている -->
<li><a href="/">ホーム</a> &gt;</li>
```

区切りは **見た目のためだけの飾り** です。CSS 側に置きます。要素の後ろに表示だけを足す書き方が **`::after`** です。

```css
.breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
}

.breadcrumb li:not(:last-child)::after {
  content: "/";
  margin-inline: 8px;
  color: var(--faint);
}
```

- `content` … 表示する文字。ここに書いた文字は HTML の中身にはならない
- `:not(:last-child)` … 最後の項目のうしろには付けない
- `flex-wrap: wrap` … 階層が深くて幅が足りないときに折り返す

記号を `>` に変えたくなったら、この 1 行を直すだけで全ページに反映されます。HTML には道のりの文字しか残っていない、という状態が理想です。

1 つ、正直に書いておきます。**`content` に書いた文字が読み上げられないとは限りません。** 読み上げソフトとブラウザーの組み合わせによっては、生成された文字もそのまま読まれます。ですから「CSS に移したから読み上げ対策になる」とは覚えないでください。

ここで確実に良くなるのは **HTML の整理** のほうです。

- 道のりの文字と飾りの記号が混ざらない
- 記号を変えるとき 1 か所で済む

読み上げから確実に外したいときは、区切り用の要素を置いて `aria-hidden="true"` を付けます。

```html
<li><a href="/">ホーム</a> <span aria-hidden="true">/</span></li>
```

この講座では、まず `::after` の形を身につけてください。確実さが要る案件では上の書き方に切り替えます。

## 2-2-3 主従はトークンの濃さで付ける

> **パンくずの文字と区切りは、濃さの違うトークンで主従を付ける**

パンくずはページの主役ではなく補助情報です。本文と同じ濃さだと主役に見えてしまい、薄くしすぎると読めません。**読めるが目立たない**濃さに置きます。

濃さの違いもトークンにします。

```css
:root {
  --ink: oklch(25% 0 0);
  --muted: oklch(55% 0 0);
  --faint: oklch(75% 0 0);
}
```

`--ink` は本文の文字色、`--muted` は控えめな文字、`--faint` は最も薄い飾りです。役割の名前なので、色を変えても名前が嘘になりません。

```css
.breadcrumb {
  font-size: 0.875rem;

  a { color: var(--muted); }
  li:last-child { color: var(--ink); }
  li::after { color: var(--faint); }
}
```

3 段階の濃さが付くことで、**現在地がいちばん濃く、区切りがいちばん薄い**という主従が生まれます。この差自体が「いまここ」を伝える手がかりになります。

## 2-2-4 現在地はaria-currentで示す

> **現在地の項目はaria-current="page"で示し、その属性セレクタで見た目を変える**

前のトピックで現在地を濃くしましたが、これは **見た目だけの表現** です。読み上げソフトには何も伝わっていません。

そこで、HTML 側に印を付けます。

```html
<li aria-current="page">UI部品 入門</li>
```

`aria-current` は「この項目がいまの現在地だ」と機械に伝える属性です。値の `page` は「現在のページ」を意味します。

CSS はこの印を手がかりに当てます。角かっこで属性を条件にするセレクタを **属性セレクタ** と呼びます。

```css
.breadcrumb [aria-current="page"] {
  color: var(--ink);
  font-weight: 600;
}
```

`:last-child` で選んでも見た目は同じにできます。違うのは **選び方の根拠** です。

- `:last-child` … 位置で選ぶ。並べ替えたり項目を足したりすると意味がずれる
- `[aria-current="page"]` … 意味で選ぶ。読み上げにも同じ情報が伝わる

**印を HTML に付け、その印で CSS を当てる**。この形はこのあとのページネーション・フォーム・開閉でも繰り返し出てきます。

## もっと知りたい人へ

- [Breadcrumb Navigation(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Breadcrumb_navigation)
- [`::after`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/::after)
- [`aria-current`(MDN)](https://developer.mozilla.org/ja/docs/Web/Accessibility/ARIA/Attributes/aria-current)

---

演習は [practice.md](practice.md) にあります。
