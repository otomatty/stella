# レッスン3-3 detailsで開閉する

## このレッスンの目標

- [ ] `details` と `summary` で開閉する部品を作れる
- [ ] 既定の印を消して、自分の印に置き換えられる
- [ ] 開いている状態を `[open]` で選び、見た目を変えられる

## 3-3-1 detailsはJavaScriptなしで開閉する

> **detailsとsummaryは、JavaScriptなしで開閉できる部品を作る**

よくある質問を全部開いて並べると、ページがとても長くなります。必要な人だけが開いて読める形にしたいところです。

こうした **開閉** の仕組みは、以前は JavaScript の仕事でした。いまは HTML だけで作れます。

```html
<details>
  <summary>受講に必要な環境は?</summary>
  <p>ブラウザーとテキストエディタだけです。</p>
</details>
```

- `details` … 開閉するかたまり
- `summary` … いつも見えている見出し。`details` の **最初の子** として書く
- 残りの中身 … 開いたときに出る本文

`summary` を押すと開き、もう一度押すと閉じます。CSS も JavaScript も要りません。キーボードでも操作でき、ページ内検索で閉じた中身が見つかったときに自動で開くブラウザーもあります。**自分で作るより、正しく動く部品が手に入る**わけです。

最初から開いておきたいときは `open` 属性を付けます。

```html
<details open>
  <summary>受講に必要な環境は?</summary>
  <p>ブラウザーとテキストエディタだけです。</p>
</details>
```

この `open` は、利用者が閉じると自動で外れます。**開閉の状態が HTML の属性として持たれている**という点が、あとで効いてきます。

## 3-3-2 summaryの印は置き換えられる

> **summaryの既定の三角は::markerで消して、自分の印に置き換えられる**

2 段階目のレイアウトです。`summary` の先頭には、ブラウザーが三角の印を付けます。形がページの他の記号と合わないときは、置き換えられます。

`summary` の印を指すのが **`::marker`** です。リストの中黒や番号を指すのと同じ仕組みです。

```css
summary {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;

  &::marker {
    content: "";
  }
}
```

`content: ""` で既定の三角を消し、`display: flex` で印と文字を並べる準備をします。`cursor: pointer` は「押せる」ことをマウスの利用者に伝える指定です。

消したままにはしません。代わりの印を `::before` で置きます。

```css
summary::before {
  content: "＋";
  color: var(--muted);
}
```

パンくずの区切り記号と同じで、**飾りの文字は CSS 側に置きます**。開いたときの印は、このあとのトピックで切り替えます。

## 3-3-3 開閉の枠と余白をトークンで当てる

> **detailsの枠・余白・角丸はトークンで当てて、他の部品とそろえる**

3 段階目です。開閉の部品では、**閉じているときの見え方**が見た目の主役になります。よくある質問が 10 件並べば、閉じた見出しが 10 行続くからです。

区切りが無いとどこまでが 1 件か分からないので、1 件を箱として見せます。

```css
details {
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-2);
  background-color: var(--surface);
}
```

見覚えのある 4 行だと思います。**カードで使ったトークンと同じ**です。同じ値を参照しているので、カードと並べても同じ世界の部品に見えます。

複数並べるときは、これまでと同じく親の `gap` で積みます。

```css
.faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
```

## 3-3-4 開いている間は[open]で選ぶ

> **開いているdetailsは[open]の属性セレクタで選び、見た目を変えられる**

4 段階目の状態です。この部品の状態は「開いているかどうか」です。

3-3-1 で見たとおり、開いている `details` には `open` 属性が付いています。閉じると外れます。**この属性を属性セレクタで選べば、開いている間だけの見た目を書けます。**

```css
details[open] {
  border-color: var(--accent);

  summary::before {
    content: "−";
  }
}
```

開いている間だけ枠の色が変わり、印が「＋」から「−」に変わります。印が変わることで、いま開いているのか閉じているのかがひと目で分かります。

ここで押さえてほしいのは、**状態が HTML の属性として現れている**ことです。

- `open` を付け外しするのはブラウザー
- CSS は「いま付いているか」を見るだけ
- JavaScript で状態を持つ必要がない

パンくずの `aria-current` は自分で書く印でしたが、`open` はブラウザーが書く印です。どちらも **印を手がかりに CSS を当てる** という形は同じです。

この考え方は、次のモジュールで扱うポップオーバーとダイアログにそのままつながります。

## もっと知りたい人へ

- [`details`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/details)
- [`summary`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/summary)
- [`::marker`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/::marker)

---

演習は [practice.md](practice.md) にあります。
