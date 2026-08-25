# レッスン5-2 演習 — フォントと文字の装飾

対象トピック: 5-2-1 〜 5-2-3

## 手元で試す

`style.css` に次を足して保存し、再読み込みしてください。

```css
body {
  font-family: "Hiragino Sans", "Meiryo", sans-serif;
}

h1 {
  text-align: center;
  font-weight: 500;
}
```

見出しが中央にそろい、太さが少し控えめになれば成功です。書けたら、次の改造をしてみましょう。

1. `font-family` の値を `serif` だけに変えて、明朝体になることを確かめる(確かめたら戻す)
2. `font-family` の先頭に `"Nonexistent Font",` を足して、存在しない書体は飛ばされることを確かめる(確かめたら戻す)
3. `h1` に `margin: 0 auto;` を足して、文字の位置が変わらないことを確かめる(確かめたら消す)
4. 段落に `font-weight: bold;` を当てて、`strong` で囲んだときと見た目が同じになることを確かめる(確かめたら消す)

## 演習問題

### 問1(基本)

ページ全体をゴシック体にしたいとき、`font-family` はどの要素に書くのがよいですか。理由も1文で書いてください。

### 問2(基本)

`font-family` の候補の最後に総称名を置くのはなぜですか。

### 問3(応用)

「この一文を太字にしてください」と頼まれました。`strong` と `font-weight` のどちらを使いますか。理由も1文で書いてください。

### 問4(応用)

見出しを中央に置きたくて `margin: 0 auto` を書きましたが、文字は左のままでした。原因を1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`body` に書きます。文字にかかわるプロパティは継承されるので、1か所でページ全体に効くためです。

</details>

<details>
<summary>問2の解答例</summary>

書体名の候補がすべて端末に無かったときでも、総称名なら必ず何かに当たり、意図から大きく外れない見た目になるためです。

</details>

<details>
<summary>問3の解答例</summary>

`font-weight` です。見た目を太くしたいだけで、読み飛ばされると困るという意味の印ではないためです。

</details>

<details>
<summary>問4の解答例</summary>

`margin: 0 auto` は箱そのものを動かす指定で、中の行は動かないためです。行を寄せるなら `text-align: center` を使います。

</details>

## 確認クイズ

### Q1. font-family に候補を複数書くのはなぜですか。

- A. 書体が混ざって表示されるから
- B. 指定した書体が端末に無いことがあるから
- C. 文字が大きくなるから

<details>
<summary>答え</summary>

**B** — 左から順に探し、最初に見つかった書体が使われます。

</details>

### Q2. sans-serif はどういう指定ですか。

- A. 特定の書体名
- B. ゴシック体ならどれでもよいという総称名
- C. 文字の太さ

<details>
<summary>答え</summary>

**B** — 候補の最後に置くと、どの端末でも必ず何かに当たります。

</details>

### Q3. 見た目だけ太字にしたいときに使うのはどれですか。

- A. strong
- B. font-weight
- C. text-align

<details>
<summary>答え</summary>

**B** — strong は重要さの印です。見た目の太さは font-weight で指定します。

</details>

### Q4. text-align: center が動かすものはどれですか。

- A. 箱そのもの
- B. 箱の中の行
- C. 箱の余白

<details>
<summary>答え</summary>

**B** — 箱は動きません。箱そのものを中央に置くなら margin: 0 auto です。

</details>

### Q5. 表の数字の桁をそろえて読みやすくする値はどれですか。

- A. text-align: left
- B. text-align: center
- C. text-align: right

<details>
<summary>答え</summary>

**C** — 右にそろえると桁の位置がそろいます。

</details>
