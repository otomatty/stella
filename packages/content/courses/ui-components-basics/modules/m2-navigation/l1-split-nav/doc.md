# レッスン2-1 スプリットナビ

## このレッスンの目標

- [ ] ナビゲーションの骨格を `nav` + `ul` で書ける
- [ ] 特定の項目だけを端へ寄せるレシピを使える
- [ ] リンクの見た目と状態を、トークンでまとめて当てられる

## 2-1-1 ナビはnavとulで書く

> **ナビゲーションは、navの中のulにリンクを1つずつ並べて書く**

ページの上部に並ぶリンクの集まりを **ナビゲーション** と呼びます。骨格は 2 つの要素で決まります。

```html
<nav class="site-nav">
  <ul>
    <li><a href="/">ホーム</a></li>
    <li><a href="/courses">研修一覧</a></li>
    <li class="login"><a href="/login">ログイン</a></li>
  </ul>
</nav>
```

- `nav` … ここが案内の区画であることを示す
- `ul` … 項目が何個あるかを伝える。`li` で 1 項目ずつ包む

`<a>` を並べるだけでも、CSS を当てれば見た目は同じにできます。しかし読み上げソフトは「リンク」が続いていることしか伝えられません。`nav` + `ul` で書くと「ナビゲーション、リスト、3 項目」と伝わり、まとめて読み飛ばすこともできます。

順番に意味がある一覧(手順やパンくず)なら `ol`、順番に意味がなければ `ul` です。サイトの主要メニューは普通 `ul` を使います。

骨格の段階で決めるのは、**見た目ではなく伝わる情報**です。CSS はまだ書きません。

## 2-1-2 離す項目はautoマージンで寄せる

> **横並びのナビは、離したい項目にmargin-inline-start: autoを当てると端へ寄る**

左にメニュー、右にログイン。この左右に分かれたナビを **スプリットナビ** と呼びます。

やってしまいがちなのが、幅を数えて固定値で押しやる書き方です。

```css
/* 項目が1つ増えた瞬間に崩れる */
.site-nav li.login {
  margin-left: 320px;
}
```

代わりに **autoマージン** を使います。`auto` は「余った幅を全部ここに入れる」という意味なので、幅を数える必要がありません。

```css
.site-nav ul {
  display: flex;
  gap: 16px;
  list-style: none;
  padding: 0;
}

.site-nav li.login {
  margin-inline-start: auto;
}
```

離したい項目に class を付けて、そこだけに当てるのがコツです。項目が増えても文言が長くなっても、余りを自動で吸収するので崩れません。

**当てる相手を間違えやすい**ので気をつけてください。`auto` が余った幅を吸収できるのは **フレックスアイテム**、つまり flex コンテナの直下の子だけです。ここで flex コンテナにしたのは `ul` なので、アイテムは `li` です。`class="login"` を中の `a` に付けて `.site-nav .login { margin-inline-start: auto; }` と書いても、`a` はフレックスアイテムではないので何も動きません。効かないときは、まず class が `li` に付いているかを見てください。

`margin-left` ではなく `margin-inline-start` で書いているのは、文章が流れる向きを基準にするためです。右から左に書く言語のページでは、自動的に反対側へ寄ります。

`list-style: none` と `padding: 0` は、`ul` の既定の中黒と字下げを消すための決まり文句です。

## 2-1-3 リンクの見た目をトークンでそろえる

> **ナビのリンクの色と余白は、トークンで全項目そろえる**

3 段階目です。リンクの既定は青くて下線付きなので、同じ見た目の項目が並ぶナビでは主張が強すぎます。

```css
.site-nav a {
  color: var(--ink);
  padding-block: var(--space-2);
  padding-inline: var(--space-2);
  text-decoration: none;
}
```

当てる相手は「ナビの中の `a`」です。項目ごとに書かないので、項目が増えても書き忘れが起きません。

`padding-block` を入れているのは見た目のためだけではありません。文字の高さしかないリンクは当たり判定が細く、指でもマウスでも狙いにくくなります。上下に厚みを持たせると押しやすくなります。

`text-decoration: none` で下線を消しますが、**消しっぱなしにはしません**。次のトピックで、状態のときに手がかりを返します。

## 2-1-4 ナビのリンクの状態を描く

> **ナビのリンクは&:hoverで色を変え、&:focus-visibleで枠を出す**

下線を消したので、静止した状態ではリンクだと分かりにくくなっています。消したぶんの手がかりを、状態として返します。

```css
.site-nav a {
  color: var(--ink);
  text-decoration: none;

  &:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
}
```

2 つの状態は役割が違います。

- `:hover` … 「ここは押せる」の合図。マウスのある環境だけ
- `:focus-visible` … 「いまここにいる」の合図。キーボード操作のとき

`outline-offset` は枠を少し外側に離す指定です。文字に食い込まないので読みやすくなります。

ホバーで **色だけ** を変えるのは避けてください。色の見え方は人によって違うので、色の差だけでは伝わらないことがあります。上の例のように下線を戻す、太さを変えるといった **形の変化** を添えると確実です。

## もっと知りたい人へ

- [Split Navigation(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Split_Navigation)
- [`nav`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/nav)
- [`margin-inline-start`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/margin-inline-start)

---

演習は [practice.md](practice.md) にあります。
