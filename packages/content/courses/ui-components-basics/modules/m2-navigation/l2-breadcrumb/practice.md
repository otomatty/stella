# レッスン2-2 演習 — パンくずリスト

対象トピック: 2-2-1 〜 2-2-4

## 手元で試す

`index.html` のナビの下に、パンくずを置きます。

```html
<nav class="breadcrumb" aria-label="パンくず">
  <ol>
    <li><a href="/">ホーム</a></li>
    <li><a href="/courses">研修一覧</a></li>
    <li aria-current="page">UI部品 入門研修</li>
  </ol>
</nav>
```

`style.css` に次を足します。`--muted` と `--faint` が無ければ `:root` に足してください。

```css
.breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
}

.breadcrumb {
  font-size: 0.875rem;

  a { color: var(--muted); }

  li:not(:last-child)::after {
    content: "/";
    margin-inline: 8px;
    color: var(--faint);
  }

  [aria-current="page"] {
    color: var(--ink);
    font-weight: 600;
  }
}
```

3 項目が `/` で区切られて並び、最後だけ濃く太くなれば成功です。書けたら、次の改造をしてみましょう。

1. `content` を `">"` に変えて、全部の区切りが一度に変わることを確かめる
2. `:not(:last-child)` を外して、最後のうしろにも区切りが付いてしまうことを確かめる(確かめたら戻す)
3. 項目を 1 つ増やし、`aria-current="page"` を新しい最後の項目に付け替える

## 演習問題

### 問1(基本)

パンくずで `ul` ではなく `ol` を使うのはなぜですか。1 文で答えてください。

### 問2(基本)

パンくずの最後の項目をリンクにしないのはなぜですか。

### 問3(応用)

区切り記号を `::after` に移すと、確実に良くなるのは何ですか。2 つ挙げてください。

### 問4(応用)

現在地を `:last-child` で選ぶのと `[aria-current="page"]` で選ぶのとでは、何が違いますか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

上の階層から順に並ぶので、項目の順番に意味があるからです。

</details>

<details>
<summary>問2の解答例</summary>

最後はいま見ているページで、押しても同じページに来るだけだからです。リンクにしないこと自体が「ここが現在地」の手がかりにもなります。

</details>

<details>
<summary>問3の解答例</summary>

道のりの文字と飾りの記号が HTML の中で混ざらないことと、記号を変えるときに 1 か所で済むことです(読み上げられないことは保証されません)。

</details>

<details>
<summary>問4の解答例</summary>

`:last-child` は位置で選ぶので並べ替えると意味がずれますが、`[aria-current="page"]` は意味で選ぶうえ、同じ情報が読み上げにも伝わります。

</details>

## 確認クイズ

### Q1. パンくずリストの骨格として正しいものはどれですか。

- A. `nav` の中の `ol`
- B. `nav` の中の `ul`
- C. `footer` の中の `p`

<details>
<summary>答え</summary>

**A** — 上の階層から順に並ぶので、順序に意味のある `ol` を使います。

</details>

### Q2. `.breadcrumb li:not(:last-child)::after` が付ける区切りはどこに出ますか。

- A. 最後の項目のうしろだけ
- B. 最後以外の各項目のうしろ
- C. 各項目の前

<details>
<summary>答え</summary>

**B** — `:not(:last-child)` で最後を除いています。

</details>

### Q3. 区切り記号を `::after` の `content` で置く利点はどれですか。

- A. HTML に飾りの文字が残らず、変更も 1 か所で済む
- B. どの環境でも読み上げられなくなる
- C. 項目の数を自動で数えてくれる

<details>
<summary>答え</summary>

**A** — 見た目のためだけの文字は CSS 側に置きます。`content` の文字は環境によっては読み上げられるので、確実に外したいときは `aria-hidden="true"` を付けた要素で区切ります。

</details>

### Q4. `aria-current="page"` は何を伝える属性ですか。

- A. そのリンクが新しいタブで開くこと
- B. その項目がいまの現在地であること
- C. そのページが更新中であること

<details>
<summary>答え</summary>

**B** — 見た目を変えるだけでは伝わらない情報を、印として HTML に置きます。

</details>

### Q5. 角かっこで属性を条件にするセレクタの呼び名はどれですか。

- A. 疑似要素
- B. 属性セレクタ
- C. 結合子

<details>
<summary>答え</summary>

**B** — `[aria-current="page"]` のように、属性とその値で当てる相手を選びます。

</details>
