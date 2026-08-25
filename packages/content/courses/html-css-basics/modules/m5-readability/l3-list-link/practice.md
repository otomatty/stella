# レッスン5-3 演習 — リストとリンクの見た目

対象トピック: 5-3-1 〜 5-3-3

## 手元で試す

`index.html` の `nav` を、リストで組み直します。

```html
<nav>
  <ul class="menu">
    <li><a href="https://example.com/">トップ</a></li>
    <li><a href="https://example.com/contact">お問い合わせ</a></li>
  </ul>
</nav>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.menu {
  list-style-type: none;
}

a:link { color: navy; }
a:visited { color: purple; }
a:hover { color: crimson; }
a:focus { color: crimson; }
a:active { color: orangered; }

.menu a {
  text-decoration: none;
}

.menu a:hover {
  text-decoration: underline;
}
```

黒丸が消え、マウスを乗せると色が変わって下線が出れば成功です。書けたら、次の改造をしてみましょう。

1. `a:hover` の3行を `a:link` より前に移動して、マウスを乗せても色が変わらなくなることを確かめる(確かめたら戻す)
2. `list-style-type` を `decimal` に変えて、番号が付くことを確かめる(確かめたら `none` に戻す)
3. 本文中の段落にもリンクを置き、`text-decoration: none;` を全体に当てて、どこがリンクか分かりにくくなることを確かめる(確かめたら `.menu a` だけに戻す)

## 演習問題

### 問1(基本)

`ul` の黒丸を消すCSSを1行で書いてください。

### 問2(基本)

リンクの状態を指定するときの、正しい並び順を書いてください。

### 問3(応用)

`:hover` を書いたのに色が変わりません。原因として最初に疑うことを1文で書いてください。

### 問4(応用)

「本文中のリンクの下線を消してほしい」と頼まれました。そのまま消してよいか、判断の基準とあわせて1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
list-style-type: none;
```

指定するのは `li` ではなく `ul` 側です。継承されるので1回で足ります。

</details>

<details>
<summary>問2の解答例</summary>

`:link` → `:visited` → `:hover` → `:focus` → `:active` の順です。

</details>

<details>
<summary>問3の解答例</summary>

書いた順番を疑います。5つの状態は詳細度が同じなので、後に書いた指定が勝ちます。

</details>

<details>
<summary>問4の解答例</summary>

下線以外の手がかりがあるかどうかで判断します。本文中のリンクは手がかりが下線しかないことが多いので、消すなら太字や枠などの目印を足します。

</details>

## 確認クイズ

### Q1. リストのマーカーを消す指定はどれですか。

- A. list-style-type: none
- B. text-decoration: none
- C. display: none

<details>
<summary>答え</summary>

**A** — HTMLは ul のままにして、CSSで印だけを消します。

</details>

### Q2. リンクの状態を書く正しい順番はどれですか。

- A. hover → link → visited → focus → active
- B. link → visited → hover → focus → active
- C. active → focus → hover → visited → link

<details>
<summary>答え</summary>

**B** — 5つは詳細度が同じなので、後に書いたほうが勝ちます。順番が決まっているのはこのためです。

</details>

### Q3. :visited が表す状態はどれですか。

- A. まだ開いていないリンク
- B. 一度開いたことがあるリンク
- C. いま押している最中のリンク

<details>
<summary>答え</summary>

**B** — まだ開いていないのは :link、押している最中は :active です。

</details>

### Q4. 「色を変えてあるからリンクだと分かる」という考え方の問題はどれですか。

- A. 色の違いを見分けにくい人には伝わらない
- B. 色は必ず継承されてしまう
- C. 色を変えると下線が消える

<details>
<summary>答え</summary>

**A** — 色以外の手がかりを必ず残してください。

</details>

### Q5. ナビゲーションのリンクは下線を消しやすいのはなぜですか。

- A. リンクの数が少ないから
- B. 並びと位置が手がかりになるから
- C. 訪問済みの色が付くから

<details>
<summary>答え</summary>

**B** — 本文中のリンクは手がかりが下線しかないことが多いので、扱いが変わります。

</details>
