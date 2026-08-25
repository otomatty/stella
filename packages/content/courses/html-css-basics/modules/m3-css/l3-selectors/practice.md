# レッスン3-3 演習 — セレクタと状態

対象トピック: 3-3-1 〜 3-3-3

## 手元で試す

`index.html` の `main` に次を足します。

```html
<div class="card">
  <p>カードの中の段落です。</p>
</div>
<p>カードの外の段落です。</p>
<p><a href="https://example.com/">お問い合わせ</a></p>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.card p {
  color: gray;
}

a:hover {
  color: crimson;
}
```

カードの中の段落だけ灰色になり、リンクにマウスを乗せると色が変われば成功です。書けたら、次の改造をしてみましょう。

1. `.card p` の空白をカンマに変えて、カードの外の段落も灰色になることを確かめる(確かめたら戻す)
2. `.card` を `#card` に変え、HTML側も `id="card"` にして、同じように当たることを確かめる(確かめたら戻す)
3. 入力欄を1つ置き、`input:focus { background-color: lightyellow; }` を当てて、カーソルを入れたときだけ色が変わることを確かめる

## 演習問題

### 問1(基本)

`class="btn"` を付けた要素すべてに当てるセレクタを書いてください。

### 問2(基本)

`.menu` の中にあるリンクだけに当てるセレクタを書いてください。

### 問3(応用)

`.card p` と `.card, p` は何が違いますか。1文で説明してください。

### 問4(応用)

「focus の枠がデザインに合わないので消してほしい」と頼まれました。そのまま消してよいか、理由とあわせて1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
.btn { }
```

class で選ぶときは先頭に点を付けます。

</details>

<details>
<summary>問2の解答例</summary>

```css
.menu a { }
```

空白でつなぐと「`.menu` の中にある `a`」という意味になります。

</details>

<details>
<summary>問3の解答例</summary>

空白は範囲を絞る子孫セレクタ、カンマは両方に同じ宣言を当てるセレクタリストです。

</details>

<details>
<summary>問4の解答例</summary>

そのままは消せません。キーボードだけで操作する人が現在地を見失うので、消すなら代わりの目印を付けます。

</details>

## 確認クイズ

### Q1. id で当てるセレクタの書き方はどれですか。

- A. .footer-note
- B. #footer-note
- C. footer-note

<details>
<summary>答え</summary>

**B** — `#` が付くのがIDセレクタです。点はクラスセレクタ、記号なしは要素セレクタです。

</details>

### Q2. 実務でまず選ぶセレクタはどれですか。

- A. IDセレクタ
- B. クラスセレクタ
- C. 要素セレクタ

<details>
<summary>答え</summary>

**B** — id はページに1つしか使えず詳細度も高すぎます。見た目の使い回しは class が既定です。

</details>

### Q3. `.card p` が当たるのはどれですか。

- A. すべての段落
- B. .card の中にある段落だけ
- C. .card そのもの

<details>
<summary>答え</summary>

**B** — 空白でつなぐと「左の中にある右」を表します。

</details>

### Q4. 擬似クラスを使うとき、HTML側に必要な準備はどれですか。

- A. 特に必要ない
- B. 対応する class を付ける
- C. id を付ける

<details>
<summary>答え</summary>

**A** — 状態はブラウザーが判断します。class と違い、HTMLには何も書き足しません。

</details>

### Q5. :focus の枠を消すときに必ずやることはどれですか。

- A. 代わりの目印を付ける
- B. :hover も一緒に消す
- C. IDセレクタで指定し直す

<details>
<summary>答え</summary>

**A** — キーボード利用者は focus の枠で現在地を判断しています。消すなら代わりの目印が要ります。

</details>
