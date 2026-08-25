# レッスン4-1 演習 — ボックスと余白

対象トピック: 4-1-1 〜 4-1-5

## 手元で試す

`index.html` の body にカードを1枚足します。

```html
<div class="card">
  <h2>4月研修</h2>
  <p>対象は入社1年目の方です。</p>
</div>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.card {
  box-sizing: border-box;
  width: 300px;
  border: 1px solid gray;
  padding: 16px;
  margin: 24px;
}
```

枠が付き、文字と枠のあいだにゆとりができ、まわりに余白ができれば成功です。書けたら、次の改造をしてみましょう。

1. `padding` を 0 にして、文字が枠にくっつくことを確かめる(確かめたら16pxに戻す)
2. `.card` に `background-color: whitesmoke;` を足して、色が padding の分まで広がり margin には広がらないことを確かめる(この指定は残してよい)
3. `box-sizing` の行を消して、箱が300pxより広くなることを確かめる(確かめたら戻す)
4. `.card` に `border: 1px solid gray;` を足して枠を引き、`solid` を `dashed` に変えて線種が変わることを確かめる(枠は残してよい)

## 演習問題

### 問1(基本)

幅200px、枠が1pxの実線で灰色、内側の余白が8pxの箱を作るCSSを書いてください。セレクタは `.box` としてください。

### 問2(基本)

カードが隣のカードとくっついています。padding と margin のどちらを増やしますか。理由も1文で書いてください。

### 問3(応用)

`box-sizing` を指定していない箱に `width: 300px;` と `padding: 20px;` と `border: 1px solid gray;` を指定しました。実際の見た目の幅は何pxになりますか。

### 問4(応用)

`height` をできるだけ指定しないほうがよいのはなぜですか。1〜2文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
.box {
  width: 200px;
  border: 1px solid gray;
  padding: 8px;
}
```

`border` は「太さ 線の種類 色」の順に書きます。

</details>

<details>
<summary>問2の解答例</summary>

margin を増やします。隣との距離は箱の外側の余白で決まるからです。padding を増やしても箱が太るだけです。

</details>

<details>
<summary>問3の解答例</summary>

342pxです。300 + 左右の padding 40 + 左右の border 2 で計算します。`box-sizing: border-box;` を指定すれば、ちょうど300pxになります。

</details>

<details>
<summary>問4の解答例</summary>

文字数が増えたときに中身が箱からはみ出すためです。高さは中身に決めさせ、ゆとりは padding で作ります。

</details>

## 確認クイズ

### Q1. 要素の見え方の説明として正しいものはどれですか。

- A. 文字だけが並んでいて、箱という概念はない
- B. すべての要素が幅と高さを持つ四角い箱として置かれる
- C. 画像だけが箱として扱われる

<details>
<summary>答え</summary>

**B** — 見出しも段落も画像も、例外なく箱として置かれます。

</details>

### Q2. 枠と中身のあいだにゆとりを作るのはどれですか。

- A. padding
- B. margin
- C. width

<details>
<summary>答え</summary>

**A** — padding は内側の余白です。背景色はこの領域まで広がります。

</details>

### Q3. 隣の箱と距離を空けるのはどれですか。

- A. padding
- B. margin
- C. border

<details>
<summary>答え</summary>

**B** — margin は外側の余白です。背景色はこの領域には付きません。

</details>

### Q4. box-sizing: border-box を指定すると width はどこまでの幅になりますか。

- A. 中身だけの幅
- B. 余白と枠を含めた幅
- C. 隣との余白まで含めた幅

<details>
<summary>答え</summary>

**B** — 指定した数字がそのまま見た目の幅になります。既定では中身だけの幅です。

</details>

### Q5. padding: 16px 24px; の意味はどれですか。

- A. 上下が16px、左右が24px
- B. 左右が16px、上下が24px
- C. 上が16px、他は24px

<details>
<summary>答え</summary>

**A** — 値が2つのときは「上下、左右」の順です。

</details>
