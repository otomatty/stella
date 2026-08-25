# レッスン3-2 演習 — 余白トークンと画像の収め方

対象トピック: 3-2-1 〜 3-2-3

## 手元で試す

`style.css` の `:root` に余白の段階を足し、カードの余白をトークンに置き換えます。

```css
:root {
  --space-s: 8px;
  --space-m: 16px;
  --space-l: 32px;
}

.card {
  padding: var(--space-m);
  margin-block: var(--space-l);
}

img {
  max-width: 100%;
  height: auto;
}
```

続いて `index.html` のカードに、手元にある適当な画像を1枚置いてください(横に大きめの写真だとよく分かります)。

```html
<div class="card">
  <img src="photo.jpg" alt="オフィスの様子" width="1200" height="800" />
  <p>写真を枠に収める練習です。</p>
</div>
```

画像がカードの幅で収まっていれば成功です。書けたら、次の改造をしてみましょう。

1. `img` の `max-width: 100%` を一度消して、画像がカードを突き抜けることを確かめる(確かめたら戻す)
2. `--space-m` を `24px` に変えて、トークン1か所でカードの余白が一括で変わることを確かめる
3. `.card img { width: 100%; height: 160px; object-fit: cover; }` を足して、枠が固定されても写真がゆがまないことを確かめる。`cover` を `fill` と `contain` にも変えて違いを見る

## 演習問題

### 問1(基本)

小8px・中16px・大32pxの3段階の余白トークンを `:root` に定義してください。

### 問2(基本)

すべての画像に「箱からはみ出さない・比率を保つ」を一括で当てる2行を書いてください。

### 問3(応用)

`width: 100%` ではなく `max-width: 100%` を使う理由を1文で説明してください。

### 問4(応用)

固定サイズの枠に写真を「ゆがませず、枠いっぱいに」収めたいとき、`object-fit` のどの値を選びますか。切られる部分があってもよいものとします。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
:root {
  --space-s: 8px;
  --space-m: 16px;
  --space-l: 32px;
}
```

余白はこの段階から選び、中間の値をその場で作らないのが運用ルールです。

</details>

<details>
<summary>問2の解答例</summary>

```css
img {
  max-width: 100%;
  height: auto;
}
```

置換要素は実寸で描かれるので、上限を明示します。

</details>

<details>
<summary>問3の解答例</summary>

`width: 100%` は小さい画像まで引き伸ばしてぼやけさせるのに対し、`max-width: 100%` は大きい画像だけを縮めるからです。

</details>

<details>
<summary>問4の解答例</summary>

`cover` です。比率を保ったまま枠を埋め、はみ出す部分だけが切られます。

</details>

## 確認クイズ

### Q1. 余白をトークンの段階に絞る主な目的はどれですか。

- A. ファイルサイズを減らす
- B. ページ全体の余白のリズムをそろえる
- C. 詳細度を下げる

<details>
<summary>答え</summary>

**B** — 選択肢を数個に絞ることで、全体が自然にそろいます。調整も定義1か所で済みます。

</details>

### Q2. 画像が箱に合わせて勝手に縮まないのはなぜですか。

- A. 置換要素は中身の実寸で描かれるから
- B. ブラウザーのバグだから
- C. class を付けていないから

<details>
<summary>答え</summary>

**A** — img は中身が外部ファイルの置換要素で、実寸で描かれます。だから上限をCSSで明示します。

</details>

### Q3. `max-width: 100%` の `100%` の基準はどれですか。

- A. 画面の幅
- B. 画像の元の幅
- C. 画像が置かれた箱の幅

<details>
<summary>答え</summary>

**C** — %は置かれた親の箱が基準です。箱より大きい画像だけが縮みます。

</details>

### Q4. `object-fit` を指定しないとき(既定)の収め方はどれですか。

- A. 比率を無視して枠を埋める
- B. 比率を保って全体を見せる
- C. 画像が表示されない

<details>
<summary>答え</summary>

**A** — 既定は fill で、ゆがんででも枠を埋めます。ゆがみを避けるなら cover か contain を選びます。

</details>

### Q5. 「画像全体が必ず見えてほしい。すき間は空いてよい」に合う値はどれですか。

- A. fill
- B. cover
- C. contain

<details>
<summary>答え</summary>

**C** — contain は比率を保って全体を収め、足りない部分はすき間になります。

</details>
