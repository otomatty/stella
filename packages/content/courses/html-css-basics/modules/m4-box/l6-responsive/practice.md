# レッスン4-6 演習 — 画面幅に合わせる(最小)

対象トピック: 4-6-1 〜 4-6-3

## 手元で試す

`index.html` の `head` に、次の1行を足します。

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.container {
  max-width: 600px;
  margin: 0 auto;
}

img {
  max-width: 100%;
  height: auto;
}

@media (max-width: 600px) {
  .row {
    display: block;
  }
}
```

`main` の中身を `<div class="container">` で囲み、ブラウザーの幅を変えてみてください。広いときは中央に600pxで表示され、狭くすると画面幅まで縮み、600pxを下回るとカードが縦積みになれば成功です。

書けたら、次の改造をしてみましょう。

1. `max-width` を `width` に変えて、狭い画面で横スクロールが出ることを確かめる(確かめたら戻す)
2. `img` の指定を消して、画面より大きい画像を置き、はみ出すことを確かめる(確かめたら戻す)
3. `@media` の `600px` を `900px` に変えて、切り替わる幅が変わることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

スマートフォンで縮小表示されるのを防ぐために `head` に書く1行を書いてください。

### 問2(基本)

`width: 600px` と `max-width: 600px` の違いを1文で説明してください。

### 問3(応用)

画面より大きい画像を置いても横スクロールが出ないようにするCSSを書いてください。

### 問4(応用)

ブレークポイントの幅は、どうやって決めるのがよいですか。1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

`width=device-width` で端末の実際の幅を使います。

</details>

<details>
<summary>問2の解答例</summary>

`width` は必ずその幅になり、`max-width` は上限なので、画面が狭ければそのぶん縮みます。

</details>

<details>
<summary>問3の解答例</summary>

```css
img {
  max-width: 100%;
  height: auto;
}
```

親の幅を超えないようにし、`height: auto` で縦横比を保ちます。

</details>

<details>
<summary>問4の解答例</summary>

端末の一覧からではなく、ブラウザーの幅を狭めていって実際に崩れた幅で決めます。

</details>

## 確認クイズ

### Q1. viewport の meta を書かないとスマートフォンでどうなりますか。

- A. ページが表示されない
- B. 広い画面ぶんを縮小して表示され、字が小さくなる
- C. 文字化けする

<details>
<summary>答え</summary>

**B** — この1行が無いと、CSSをいくら書いても読みやすくなりません。

</details>

### Q2. 狭い画面でははみ出さずに縮ませたいときに使うのはどれですか。

- A. width
- B. max-width
- C. min-width

<details>
<summary>答え</summary>

**B** — max-width は上限だけを決めるので、狭い画面では縮みます。

</details>

### Q3. 画像がはみ出すのを防ぐ指定はどれですか。

- A. max-width: 100%
- B. width: 100px
- C. float: left

<details>
<summary>答え</summary>

**A** — 親の幅を超えないようにします。height: auto と組で使います。

</details>

### Q4. `@media (max-width: 600px)` の中の宣言が効くのはどんなときですか。

- A. 画面の幅が600px以下のとき
- B. 画面の幅が600px以上のとき
- C. 常に効く

<details>
<summary>答え</summary>

**A** — 条件に合うときだけ、中の宣言が有効になります。

</details>

### Q5. この講座で目標とするブレークポイントの本数はどれですか。

- A. 端末ごとに何本でも
- B. 1本
- C. 0本

<details>
<summary>答え</summary>

**B** — まず可変幅で耐え、実際に崩れる1点だけを切り替えます。

</details>
