# レッスン4-4 演習 — Gridの基本

対象トピック: 4-4-1 〜 4-4-3

## 手元で試す

はじめに、レッスン4-2・4-3で `.card` に付けた `width: 300px;` を消してください。グリッドではマスの幅を列の指定が決めるので、アイテム側に幅が残っていると、列いっぱいに広がらず `span` の効果も見えません。

そのうえで、`index.html` の `main` に、カードを5枚囲んだ親を作ります。

```html
<div class="grid">
  <div class="card featured">1枚目</div>
  <div class="card">2枚目</div>
  <div class="card">3枚目</div>
  <div class="card">4枚目</div>
  <div class="card">5枚目</div>
</div>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.featured {
  grid-column: span 2;
}
```

3列の格子になり、1枚目だけが2列ぶんの幅になれば成功です。書けたら、次の改造をしてみましょう。

1. `repeat(3, 1fr)` を `1fr 2fr 1fr` に変えて、真ん中の列だけ広くなることを確かめる(確かめたら戻す)
2. `1fr` を `200px` に変え、ブラウザーの幅を変えて右側が余ることを確かめる(確かめたら戻す)
3. `.featured` の `span 2` を `span 4` に変えて、宣言していない4列目が作られ、3列の並びが崩れることを確かめる(確かめたら戻す)
4. `gap` を 0 にして、マスがくっつくことを確かめる(確かめたら16pxに戻す)

## 演習問題

### 問1(基本)

幅を4等分した4列のグリッドを作るCSSを、`repeat` を使って書いてください。

### 問2(基本)

グリッドで、行の数はどうやって決まりますか。1文で説明してください。

### 問3(応用)

`grid-template-columns: 200px 1fr;` と書いたとき、それぞれの列の幅はどうなりますか。

### 問4(応用)

Flexで折り返した並びと、Gridで作った格子は何が違いますか。1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
```

`1fr 1fr 1fr 1fr` と書いても同じです。

</details>

<details>
<summary>問2の解答例</summary>

子の数に合わせて、必要なぶんだけ自動で作られます。行の数を指定する必要はありません。

</details>

<details>
<summary>問3の解答例</summary>

左の列は常に200px、右の列は残りの幅すべてになります。

</details>

<details>
<summary>問4の解答例</summary>

Flexは収まったところで折り返すだけなので列がそろうとは限らず、Gridは先に決めた列の枠に流し込むので縦横がそろいます。

</details>

## 確認クイズ

### Q1. 列の数を決めるプロパティはどれですか。

- A. grid-template-columns
- B. grid-column
- C. flex-wrap

<details>
<summary>答え</summary>

**A** — 並べた値の数がそのまま列の数になります。

</details>

### Q2. fr はどういう単位ですか。

- A. 固定の長さ
- B. 余った幅を分け合う比率
- C. 文字の大きさの倍率

<details>
<summary>答え</summary>

**B** — 1fr 1fr 1fr なら3等分されます。画面幅が変わっても比率は保たれます。

</details>

### Q3. `repeat(3, 1fr)` と同じ意味はどれですか。

- A. 1fr 1fr 1fr
- B. 3fr
- C. span 3

<details>
<summary>答え</summary>

**A** — repeat は同じ指定の繰り返しをまとめる書き方です。

</details>

### Q4. grid-column: span 2; を書く相手はどれですか。

- A. グリッドのコンテナ
- B. またがらせたいアイテム
- C. body

<details>
<summary>答え</summary>

**B** — 並べ方はコンテナ、個別の大きさはアイテムに書きます。

</details>

### Q5. 3列のグリッドで span 4 を指定するとどうなりますか。

- A. 3列ぶんに収まる
- B. 足りないぶんの列が自動で作られ、3列の設計が崩れる
- C. 指定が無視される

<details>
<summary>答え</summary>

**B** — 宣言していない列が足されます。span の値は列数以下にし、列数を変えたら span も見直してください。

</details>
