# レッスン2-2 論理プロパティ

## このレッスンの目標

- [ ] `margin-inline` / `margin-block` で余白をまとめて書ける
- [ ] `inline-size` を `width` の代わりに使える
- [ ] `inset` で位置指定の距離をまとめて書ける

## 2-2-1 余白は流れの向きで書ける

> **margin-inlineは、文章が流れる向きを基準に左右の余白をまとめて指定する**

HTML/CSS 入門では、余白を `margin-left` や `margin-top` のように上下左右で書いてきました。この書き方には、日々の小さな不便と、根本の問題が1つずつあります。

- 不便: 左右に同じ余白を空けたいだけで、2行書くことになる
- 根本: 「左」が文の先頭とは限らない。縦書きや、右から左へ書く言語のページでは、物理的な上下左右と文章の向きがずれる

そこで現代の CSS には、上下左右の代わりに**文章の流れる向き**を基準にした語彙があります。これを **論理プロパティ** と呼びます。

```css
.container {
  margin-inline: auto;
}

.title {
  margin-block: 24px;
}
```

- **inline** = 文字が進む向き。日本語の横書きなら左右
- **block** = 行が積み重なる向き。横書きなら上下

`margin-inline: auto` は、入門で学んだ中央寄せ `margin: 0 auto` の左右部分だけを1語で書いた形です。上下の余白に手を触れない分、意図も明確になります。

対応は次のとおりです。`padding` にも同じ形があります。

| 従来(横書き) | 論理プロパティ |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline` |
| `margin-top` / `margin-bottom` | `margin-block` |
| `padding-left` / `padding-right` | `padding-inline` |
| `padding-top` / `padding-bottom` | `padding-block` |

値を2つ書くと、先頭側・末尾側の順になります(`margin-inline: 8px 24px` なら横書きで左8px・右24px)。

## 2-2-2 幅はinline-sizeで書ける

> **inline-sizeは、文章が流れる向きの寸法を表すwidthの論理版**

余白を流れの向きで書くようにしたら、寸法も同じ物差しに揃えます。私たちが「幅」と呼んでいるものの正体は、文字が進む向きの寸法だからです。

```css
.container {
  inline-size: 640px;
  margin-inline: auto;
}
```

- **`inline-size`** = `width` の論理版
- `block-size` = `height` の論理版

横書きのページでは、見た目の結果は `width` / `height` とまったく同じです。今日から結果が変わるわけではなく、**余白も寸法も同じ基準の語彙で書ける**ことが利点です。上の2行は「幅640pxの箱を左右中央に置く」という定番の形が、どちらも流れの向きの語彙で揃った例です。

`max-` の形もそのままあります。

| 従来(横書き) | 論理プロパティ |
| --- | --- |
| `width` | `inline-size` |
| `height` | `block-size` |
| `max-width` | `max-inline-size` |

`max-inline-size` は、レッスン3-1で「1行の長さを抑える」ために使います。

## 2-2-3 位置の距離はinsetでまとめる

> **positionで使うtop・right・bottom・leftは、insetでまとめて書ける**

入門のレッスン4-5で、`position: absolute` の要素を `top` や `left` で動かしました。基準の箱いっぱいに重ねたいときは、こう書いていたはずです。

```css
.overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
```

4辺に同じ距離を書くだけで4行。これをまとめるのが **`inset`** です。

```css
.overlay {
  position: absolute;
  inset: 0;
}
```

`inset` は「内側への差し込み距離」という意味の1語で、`margin` と同じ省略記法が使えます。`inset: 0` は4辺すべて、`inset: 8px 16px` は上下8px・左右16pxです。

向きごとの形も、これまでと同じ命名で揃っています。

- `inset-inline: 0` — 流れの向きの両端(横書きなら左右)だけ
- `inset-block-start: 0` — 行が積み重なる向きの先頭(横書きなら上)だけ

`margin-inline` から `inset-inline` まで、論理プロパティは1つの体系です。「inline は文字の進む向き、block は行の積む向き」という2語を覚えれば、初めて見るプロパティでも意味を読み取れます。

## もっと知りたい人へ

- [テキスト方向の違いの操作(MDN)](https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Styling_basics/Handling_different_text_directions)
- [CSS 論理的プロパティと値(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_logical_properties_and_values)

---

演習は [practice.md](practice.md) にあります。
