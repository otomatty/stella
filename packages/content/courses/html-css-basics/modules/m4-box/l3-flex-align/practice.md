# レッスン4-3 演習 — Flexの揃えと折り返し

対象トピック: 4-3-1 〜 4-3-3

## 手元で試す

`index.html` の `main` の前に、次のヘッダーを足します。

```html
<div class="bar">
  <p>社内研修センター</p>
  <a href="https://example.com/">お問い合わせ</a>
</div>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid gray;
  padding: 16px;
}
```

題とリンクが左右に離れ、上下の中心でそろえば成功です。書けたら、次の改造をしてみましょう。

1. `justify-content` を `center` に変えて、2つが中央にまとまることを確かめる(確かめたら戻す)
2. `align-items` の行を消して、既定の `stretch` でリンクが縦に引き伸ばされることを確かめる(確かめたら戻す)
3. レッスン4-2で作った `.row` のカードを4枚に増やし、`.card` に `width: 300px;` を付ける。`.row` に `width` が残っていたら消したうえで、**ブラウザーの窓を横800pxくらいまで狭くして**、4枚が指定した300pxより細く縮むことを確かめる(窓が広いままだと4枚とも300pxで収まってしまい、縮みません)
4. 窓を狭くしたまま `.row` に `flex-wrap: wrap;` を足して、カードが300pxに戻り、4枚が複数の行に分かれることを確かめる
5. さらに窓を300pxより狭くして、`wrap` を指定していてもカードが縮むことを確かめる(`wrap` は行を分ける指定で、縮小を止める指定ではない)

## 演習問題

### 問1(基本)

フレックスアイテムを主軸の中央に寄せるCSSを1行で書いてください。

### 問2(基本)

高さの違うアイテムを、上下の中心でそろえるCSSを1行で書いてください。

### 問3(応用)

カードを6枚並べたら1枚ずつが細く潰れました。1行に詰め込むのをやめさせるには、どのプロパティに何を指定しますか。

### 問4(応用)

`justify-content` と `align-items` は、それぞれどちらの軸に効きますか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
justify-content: center;
```

主軸方向の寄せ方なので justify-content です。コンテナ側に書きます。

</details>

<details>
<summary>問2の解答例</summary>

```css
align-items: center;
```

交差軸方向の揃え方なので align-items です。

</details>

<details>
<summary>問3の解答例</summary>

既定の `nowrap` では1行に収めようとしてアイテムが縮むためです。`flex-wrap: wrap;` を指定して、複数の行に分けさせます。

</details>

<details>
<summary>問4の解答例</summary>

`justify-content` は主軸、`align-items` は交差軸に効きます。

</details>

## 確認クイズ

### Q1. 主軸方向の寄せ方を決めるプロパティはどれですか。

- A. justify-content
- B. align-items
- C. flex-wrap

<details>
<summary>答え</summary>

**A** — 主軸が justify-content、交差軸が align-items です。

</details>

### Q2. ロゴとメニューを両端に離す値はどれですか。

- A. center
- B. space-between
- C. flex-start

<details>
<summary>答え</summary>

**B** — 両端に寄せて、余りを間に配ります。

</details>

### Q3. align-items の既定値はどれですか。

- A. center
- B. flex-start
- C. stretch

<details>
<summary>答え</summary>

**C** — 交差軸いっぱいに引き伸ばすので、カードの高さが揃って見えます。

</details>

### Q4. flex-wrap: wrap を指定すると変わるのはどれですか。

- A. アイテムが縮まなくなる
- B. 1行に収まらないアイテムが次の行へ送られる
- C. アイテムの幅がそろう

<details>
<summary>答え</summary>

**B** — wrap は行を分ける指定です。行に分けたあとも、各行の中では既定どおりアイテムは縮みます。

</details>

### Q5. これらのプロパティを書く相手はどれですか。

- A. フレックスコンテナ
- B. フレックスアイテム
- C. body

<details>
<summary>答え</summary>

**A** — 「自分の子をどう並べるか」の指定なので、コンテナ側に書きます。

</details>
