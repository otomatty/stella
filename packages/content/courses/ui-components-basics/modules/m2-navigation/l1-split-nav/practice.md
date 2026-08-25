# レッスン2-1 演習 — スプリットナビ

対象トピック: 2-1-1 〜 2-1-4

## 手元で試す

`index.html` の `body` の先頭に、ナビの骨格を置きます。

```html
<nav class="site-nav">
  <ul>
    <li><a href="/">ホーム</a></li>
    <li><a href="/courses">研修一覧</a></li>
    <li><a href="/news">お知らせ</a></li>
    <li class="login"><a href="/login">ログイン</a></li>
  </ul>
</nav>
```

`style.css` に次を足します。

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

.site-nav a {
  color: var(--ink);
  padding-block: var(--space-2);
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

`--ink` と `--space-2` をまだ定義していなければ、`:root` に足してください。左に 3 項目、右端にログインが並べば成功です。書けたら、次の改造をしてみましょう。

1. 「お知らせ」の後ろに項目をもう 1 つ足して、ログインが右端に残ることを確かめる
2. `class="login"` を中の `<a>` に付け替えてセレクタも `.site-nav .login` にすると、`a` はフレックスアイテムではないので寄らなくなることを確かめる(確かめたら戻す)
3. Tab キーで各項目を進み、フォーカスの枠が出ることを確かめる

## 演習問題

### 問1(基本)

`<a>` を並べるだけの書き方と比べて、`nav` + `ul` にすると何が伝わるようになりますか。

### 問2(基本)

横並びのナビで、終端に寄せたい項目に当てるセレクタと 1 行を書いてください。`ul` を flex コンテナにしている前提です。

### 問3(応用)

`margin-inline-start: auto` の代わりに `margin-left: 320px` と書くと、どんなときに困りますか。

### 問4(応用)

`text-decoration: none` でリンクの下線を消しました。このあと必ずやるべきことは何ですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

ここが案内の区画であることと、項目が何個あるかが伝わるようになります。まとめて読み飛ばすこともできます。

</details>

<details>
<summary>問2の解答例</summary>

```css
.site-nav li.login {
  margin-inline-start: auto;
}
```

当てる相手はフレックスアイテムの `li` です。中の `a` に付けても効きません。

</details>

<details>
<summary>問3の解答例</summary>

項目が増減したり文言の長さが変わったりすると位置がずれます。`auto` なら余りを自動で吸収します。

</details>

<details>
<summary>問4の解答例</summary>

消した手がかりの代わりに、`:hover` と `:focus-visible` で状態の見た目を用意します。

</details>

## 確認クイズ

### Q1. ナビゲーションの骨格として推奨される書き方はどれですか。

- A. `nav` の中の `ul` に `li` で 1 項目ずつ入れる
- B. `div` の中に `a` を並べる
- C. `p` の中に `a` を並べる

<details>
<summary>答え</summary>

**A** — 案内の区画であることと項目数の両方が伝わります。

</details>

### Q2. 主要メニューで `ol` ではなく `ul` を使うのはなぜですか。

- A. `ol` は 1 つのページに 1 つしか置けないから
- B. 項目の順番に意味がないから
- C. `ol` にはリンクを入れられないから

<details>
<summary>答え</summary>

**B** — 順番に意味がある一覧(手順やパンくず)なら `ol` を使います。

</details>

### Q3. `margin-inline-start: auto` はどの要素に当てると効きますか。

- A. flex コンテナの直下の子(フレックスアイテム)
- B. その中に入っているリンク
- C. flex コンテナ自身

<details>
<summary>答え</summary>

**A** — `auto` は「余った幅を全部この余白に入れる」という意味ですが、余りを吸収できるのはフレックスアイテムだけです。`ul` が flex なら `li` に当てます。

</details>

### Q4. `margin-left` ではなく `margin-inline-start` を使う利点はどれですか。

- A. 指定できる単位が増える
- B. 文章が流れる向きを基準にするので、右から左に書く言語でも正しく寄る
- C. 古いブラウザーでも動く

<details>
<summary>答え</summary>

**B** — 論理プロパティは文章の流れを基準にします。

</details>

### Q5. ホバー時に色だけを変えるのを避けるのはなぜですか。

- A. 色の変化は処理が重いから
- B. 色の見え方は人によって違い、差が伝わらないことがあるから
- C. 色を変えるとフォーカスが外れるから

<details>
<summary>答え</summary>

**B** — 下線を戻す・太さを変えるといった形の変化を添えると確実に伝わります。

</details>
