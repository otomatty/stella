# レッスン3-2 演習 — skip linkと仕上げ

対象トピック: 3-2-1 〜 3-2-4

## 手元で試す

レッスン3-1 の続きで、ページを完成させます。

まず skip link を足します。`header` の最初の子としてリンクを置き、`main` に `id` を付けます。

```html
<header>
  <a class="skip-link" href="#content">本文へ飛ぶ</a>
  <div class="wrapper">…</div>
</header>
<main id="content">…</main>
```

`style.css` に skip link の隠し方と、狭い幅の直しを足します。

```css
.skip-link {
  position: absolute;
  inset-block-start: -100%;
  background-color: var(--accent);
  color: var(--surface);
  padding: var(--space-2) var(--space-3);

  &:focus-visible {
    inset-block-start: 0;
  }
}

@media (max-width: 600px) {
  .site-nav ul {
    flex-direction: column;
    align-items: flex-start;

    .login {
      margin-inline-start: 0;
    }
  }
}
```

最後に、3 項目の点検でページを完成にします。

1. **landmark** … `main` が 1 つだけか、`header` / `main` / `footer` の外に直置きの内容が無いか、2 つの `nav` に `aria-label` が付いているかを、HTML を読んで確かめる
2. **タブで一巡** … ページを開いて Tab の 1 回目で「本文へ飛ぶ」が現れるか、Enter で本文へ飛べるか、ナビ・カード・フォーム・ダイアログのボタンまでフォーカスの枠が見えたまま一巡できるかを確かめる
3. **トークン** … `style.css` の `:root` が先頭の 1 セットだけか、部品の CSS に生の色や余白の値が紛れていないかを確かめる

余裕があれば、`.skip-link` を一時的に `display: none` にして、Tab で止まれなくなること(隠し方の違い)を確かめてください(確かめたら戻す)。

## 演習問題

### 問1(基本)

skip link の行き先はどこで、HTML では何を使ってつなぎますか。1 文で答えてください。

### 問2(基本)

skip link を隠すのに `display: none` を使ってはいけない理由を 1 文で答えてください。

### 問3(応用)

このページで、狭い画面向けの `@media` に書いたのがナビの縦積みだけで済んだのはなぜですか。カード・wrapper・フォームのそれぞれについて 1 行で答えてください。

### 問4(応用)

仕上げの点検 3 項目を挙げ、それぞれ何を確かめるのかを 1 行ずつ書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

行き先は `main` で、`main` に付けた `id` を `href="#content"` のページ内リンクで指してつなぎます。

</details>

<details>
<summary>問2の解答例</summary>

`display: none` は存在ごと消すので Tab で止まれなくなり、フォーカスを受け取れる状態で隠す(画面の外へ動かす)必要があるからです。

</details>

<details>
<summary>問3の解答例</summary>

- カード … `repeat(auto-fill, minmax())` が列数を自動で畳むから
- wrapper … `padding-inline` が狭い幅での端の逃げになっているから
- フォーム … `max-inline-size` は上限の指定で、狭い幅ではそもそも効いていないから

</details>

<details>
<summary>問4の解答例</summary>

- landmark の点検 … `main` が 1 つか、直置きの内容が無いか、複数の `nav` に `aria-label` が付いているか
- タブでの一巡 … skip link から本文へ飛べ、すべての押せる要素でフォーカスの枠が見えるか
- トークンの点検 … `:root` が 1 セットだけで、部品の CSS に生の値が無いか

</details>

## 確認クイズ

### Q1. skip link を置く位置と行き先の組み合わせとして正しいのはどれですか。

- A. ページの最初に置き、`main` の `id` へ飛ばす
- B. `footer` に置き、ページの先頭へ飛ばす
- C. `main` の中に置き、`header` へ飛ばす

<details>
<summary>答え</summary>

**A** — Tab の 1 回目でフォーカスが乗る位置に置き、ナビを飛ばして本文へ届けます。

</details>

### Q2. skip link の隠し方として正しいのはどれですか。

- A. `display: none` で消す
- B. 画面の外に置き、`:focus-visible` で見える位置に戻す
- C. 文字色を背景色と同じにする

<details>
<summary>答え</summary>

**B** — 消すのではなく画面の外へ動かします。A は Tab で止まれなくなり、C は見えないのにフォーカスの行き先だけがある状態になります。

</details>

### Q3. この講座のページで、狭い画面向けの `@media` の扱いはどれですか。

- A. 書かない
- B. 幅 1 本にまとめ、幅で崩れる場所だけを直す
- C. 幅ごとに何本でも書く

<details>
<summary>答え</summary>

**B** — `auto-fill` のカードや wrapper は幅に追従するので、直すのはナビの向きくらいです。複数ブレークポイントの設計はこの講座の外です。

</details>

### Q4. 仕上げの点検 3 項目に含まれないのはどれですか。

- A. landmark の数と直置きの有無
- B. タブでの一巡とフォーカスの枠
- C. 画像のファイルサイズ

<details>
<summary>答え</summary>

**C** — 点検するのは landmark・タブの一巡・トークンの 1 セットの 3 つで、いずれもこの講座で決めた原則の確認です。

</details>

### Q5. 点検で「2 つ目の `:root`」が見つかったときの直し方はどれですか。

- A. 後の `:root` を先頭の 1 セットへ統合する
- B. 2 つとも残して優先度で調整する
- C. トークンをやめて生の値に戻す

<details>
<summary>答え</summary>

**A** — 定義の出どころは 1 か所だけにします。2 セットあると後の定義が前を上書きし、原因の探しにくいずれになります。

</details>
