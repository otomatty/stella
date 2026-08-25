# レッスン1-2 演習 — ヘッダとパンくず

対象トピック: 1-2-1 〜 1-2-4

## 手元で試す

レッスン1-1 の `index.html` / `style.css` の続きです。`header` の中身をスプリットナビに置き換え、`main` の先頭にパンくずを足します。

`index.html` の `header` と `main` を次の形にします。

```html
<header>
  <div class="wrapper">
    <nav class="site-nav" aria-label="メイン">
      <ul>
        <li><a href="/">ホーム</a></li>
        <li><a href="/docs">資料室</a></li>
        <li class="login"><a href="/login">ログイン</a></li>
      </ul>
    </nav>
  </div>
</header>
<main>
  <div class="wrapper">
    <nav class="breadcrumb" aria-label="パンくず">
      <ol>
        <li><a href="/">ホーム</a></li>
        <li aria-current="page">勉強会一覧</li>
      </ol>
    </nav>
    <h1>勉強会一覧</h1>
    <p>毎週の勉強会の予定と申し込みをまとめたページです。</p>
  </div>
</main>
```

`style.css` に、帯と wrapper、そして部品講座で作った 2 つの部品の CSS を足します(部品の CSS は手元にあるものをそのまま貼り付けてかまいません。無い場合は次の最小版を使ってください)。

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

.site-nav {
  ul {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    list-style: none;
    margin-block: 0;
    padding: var(--space-2) 0;
  }

  .login {
    margin-inline-start: auto;
  }

  a {
    color: var(--ink);

    &:hover {
      color: var(--accent);
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}

.breadcrumb {
  ol {
    display: flex;
    gap: var(--space-2);
    list-style: none;
    margin-block: 0;
    padding-inline-start: 0;
  }

  li:not(:last-child)::after {
    content: "›";
    margin-inline-start: var(--space-2);
    color: var(--faint);
  }

  [aria-current="page"] {
    color: var(--muted);
  }
}
```

保存して再読み込みし、次の 3 点を確かめます。

1. ヘッダの帯が画面の端から端まで塗られ、ナビと本文の左端が同じ縦のラインにそろっている
2. ブラウザーの幅をゆっくり広げて、960px を超えたところで中身が中央にとどまる
3. `.wrapper` の `padding-inline` を一時的に `0` にして、狭い幅で中身が端に張り付くことを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

スプリットナビを `body` 直下から `header` の中へ移しても、`.site-nav` の CSS を書き直さなくてよいのはなぜですか。1 文で答えてください。

### 問2(基本)

「背景は画面の全幅、中身は 960px で中央」を作るとき、背景を塗る要素と幅を決める要素はそれぞれどれですか。

### 問3(応用)

パンくずリストを `header` の中ではなく `main` の先頭に置く理由を、`header` の役割と対比して 1〜2 文で答えてください。

### 問4(応用)

`aria-label="メインナビゲーション"` という名前付けの問題点と、直した形を答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`.site-nav` の指定は class しか見ておらず、親がどの要素かに依存していないからです。置き場所に依存しない書き方が、部品を持ち運べる条件です。

</details>

<details>
<summary>問2の解答例</summary>

背景を塗るのは帯である `header` 自身、幅を決めるのはその直下にはさむ `.wrapper` です。塗る役と幅の役を分けるのがこの型の要点です。

</details>

<details>
<summary>問3の解答例</summary>

`header` はどのページでも同じ中身にしたいサイト共通の帯なのに対し、パンくずはページごとに変わる現在地の情報だからです。本文の一部として `main` の先頭に置くと、本文に移動した直後に現在地が分かります。

</details>

<details>
<summary>問4の解答例</summary>

`nav` 自体が「ナビゲーション」と読み上げられるため、「メインナビゲーション ナビゲーション」と二重に聞こえます。`aria-label="メイン"` のように役割だけを短く書きます。

</details>

## 確認クイズ

### Q1. 作ってある部品をページに載せるときの基本はどれですか。

- A. 置き場所に合わせて CSS を書き直す
- B. HTML と部品の CSS のひとまとまりを、中身を変えずに持ってくる
- C. class を外して要素セレクタに変える

<details>
<summary>答え</summary>

**B** — class で当てた部品は親が変わっても効き方が変わりません。載せるときに作り直しが要るなら、部品の作り方に問題があったサインです。

</details>

### Q2. ヘッダの「全幅の帯 + 決まった幅の中身」の作り方として正しいのはどれですか。

- A. `header` に背景を塗り、直下の `.wrapper` で幅と中央寄せを決める
- B. `header` の幅を 960px にして中央へ寄せる
- C. `.wrapper` に背景を塗って全幅に伸ばす

<details>
<summary>答え</summary>

**A** — 帯の背景は全幅の `header` 側、中身の幅は内側の `.wrapper` 側と役割を分けます。B は帯が途切れ、C は背景が中身の幅までしか塗られません。

</details>

### Q3. `.wrapper` の `margin-inline: auto` は何のためですか。

- A. 上限の幅を決めるため
- B. 余った左右の幅を等分して中央に置くため
- C. 画面が狭いときの逃げの余白のため

<details>
<summary>答え</summary>

**B** — 上限は `max-inline-size`、狭いときの逃げは `padding-inline` の役割です。3 つで 1 セットです。

</details>

### Q4. パンくずリストの置き場所として正しいのはどれですか。

- A. `header` の中
- B. `main` の先頭
- C. `footer` の中

<details>
<summary>答え</summary>

**B** — パンくずはページごとに変わる現在地の情報なので、本文の一部として `main` の先頭に置きます。

</details>

### Q5. `nav` が 2 つあるページで `aria-label` を付ける目的はどれですか。

- A. ナビの見た目を変えるため
- B. landmark の一覧でどのナビか読み分けられるようにするため
- C. `nav` を landmark から外すため

<details>
<summary>答え</summary>

**B** — 画面の見た目は変わりませんが、一覧に並ぶ 2 つの「ナビゲーション」に表札が付きます。

</details>
