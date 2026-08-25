# レッスン1-2 ヘッダとパンくず

## このレッスンの目標

- [ ] 作ってあるスプリットナビを、書き直さずに `header` へ載せられる
- [ ] 「全幅の帯 + wrapper 幅の中身」でヘッダと本文の幅をそろえられる
- [ ] パンくずを `main` の先頭に置き、複数の `nav` を `aria-label` で区別できる

## 1-2-1 スプリットナビはheaderに載せる

> **作ってあるスプリットナビは、中身を変えずにheaderの中へそのまま載せる**

骨格ができたので、部品を載せていきます。1 つ目は部品講座で作った **スプリットナビ**(ログインだけ右端へ寄るナビ)です。

載せるといっても、書き直しはありません。HTML はナビのひとかたまりを `header` の中へ移し、CSS は `.site-nav` のひとまとまりをそのまま持ってくるだけです。

```html
<header>
  <nav class="site-nav">
    <ul>
      <li><a href="/">ホーム</a></li>
      <li><a href="/docs">資料室</a></li>
      <li class="login"><a href="/login">ログイン</a></li>
    </ul>
  </nav>
</header>
```

そのまま効くのは、部品の CSS が **class しか見ていない**からです。`.site-nav` の指定は、親が `body` でも `header` でも当たり方が変わりません。ログインの項目が `margin-inline-start: auto` で右端へ寄る動きも、そのまま効きます。

逆に、載せるときに作り直しが要るとしたら、それは部品の作り方に問題があったサインです(たとえば `body > nav` のように置き場所へ依存したセレクタで書いていた場合)。部品講座で class に当てて入れ子でまとめる書き方をしてきたのは、この「どこへでも持っていける」性質のためでした。

## 1-2-2 帯は全幅、中身はwrapper

> **headerの帯は全幅に伸ばし、中身はwrapperで本文と同じ幅の中央にそろえる**

ナビは載りましたが、このままだと中身が画面の左端に張り付きます。実在のサイトのヘッダは、ほぼすべて「背景は画面の端から端まで、中身は決まった幅で中央」という作りです。この 2 つを両立させます。

役割を 2 つに分けます。全幅に塗る外側を **帯**、中身の幅をそろえる内側の囲みを **wrapper** と呼びます。

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

- `header` には背景と下の境界線だけ。ブロックの背景は既定で全幅に伸びるので、何も足さなくても帯になります
- `.wrapper` は上限の幅(`max-inline-size`)、左右の `auto` margin による中央寄せ(`margin-inline: auto`)、画面が狭いときに中身が端へ張り付かないための逃げ(`padding-inline`)の 3 つです

HTML では、帯の直下に wrapper を 1 枚はさみます。

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

同じ `.wrapper` を `header` と `main`(あとで `footer` にも)で使い回すのがポイントです。ナビの左端と本文の左端が同じ縦のラインにそろい、ページ全体が 1 つのまとまりに見えます。幅の値をページ内で 1 つにするため、wrapper も **トークンと同じく 1 種類だけ**にします。

## 1-2-3 パンくずはmainの先頭に置く

> **パンくずリストは、mainの先頭に置いて現在地までの道筋を示す**

2 つ目の部品は **パンくずリスト**(上の階層から現在地までを順に並べたリスト)です。部品はできているので、決めるのは置き場所だけです。

パンくずは「この本文がサイトのどこにあるか」という **現在地** の情報です。だから本文の一部として `main` の中に置きます。そして読み始める前に知りたい情報なので、`h1` より前、`main` の先頭です。

```html
<main>
  <div class="wrapper">
    <nav class="breadcrumb">
      <ol>
        <li><a href="/">ホーム</a></li>
        <li aria-current="page">勉強会一覧</li>
      </ol>
    </nav>
    <h1>勉強会一覧</h1>
    …
  </div>
</main>
```

`header` に入れない理由も置き場所の意味から説明できます。`header` はサイト共通の帯で、どのページでも同じ中身にしておきたい場所です。パンくずはページごとに変わる情報なので、共通の帯には合いません。

landmark 単位で移動する人にとっては、`main` へ飛んだ直後にパンくずと出会える、という実利もあります。本文に着いた瞬間に「いまここ」が分かる並びです。

## 1-2-4 navはaria-labelで区別する

> **navが複数あるページでは、aria-labelで名前を付けてどのナビか区別する**

ここで骨格の地図を見直すと、問題が 1 つ増えています。スプリットナビも `nav`、パンくずも `nav` なので、landmark の一覧には「ナビゲーション」が 2 つ並びます。名前が無いと、どちらがサイト内の移動でどちらが現在地か、開くまで分かりません。

`aria-label` は、landmark に読み上げ用の名前を付ける属性です。それぞれの `nav` に短い名前を付けます。

```html
<header>
  <nav class="site-nav" aria-label="メイン">…</nav>
</header>
<main>
  <nav class="breadcrumb" aria-label="パンくず">…</nav>
</main>
```

画面の見た目は何も変わりませんが、一覧は「メイン ナビゲーション」「パンくず ナビゲーション」と読み分けられるようになります。

名前の付け方には決まりごとが 1 つあります。**「ナビゲーション」という語をラベルに入れない**ことです。`nav` という要素自体が「ナビゲーション」と読み上げられるので、`aria-label="メインナビゲーション"` と書くと「メインナビゲーション ナビゲーション」と二重に聞こえます。役割だけを短く書きます。

なお、ページに `nav` が 1 つしか無いなら付けなくてもかまいません。区別の必要が生まれたときに付ける属性です。

## もっと知りたい人へ

- [Split navigation(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Split_Navigation)
- [Breadcrumb navigation(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Breadcrumb_navigation)
- [Landmarks パターン(WAI-ARIA APG)](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/)

---

演習は [practice.md](practice.md) にあります。
