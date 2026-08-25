# レッスン2-2 演習 — 論理プロパティ

対象トピック: 2-2-1 〜 2-2-3

## 手元で試す

`style.css` の `.card`(レッスン2-1で作ったもの)を、論理プロパティで書き直します。

```css
.card {
  border: 1px solid gray;
  padding-block: 16px;
  padding-inline: 24px;
  inline-size: 320px;
  margin-inline: auto;
}
```

カードが上下16px・左右24pxの内側余白を持ち、幅320pxで左右中央に置かれれば成功です。見た目は従来の書き方と同じになります。書けたら、次の改造をしてみましょう。

1. `padding-inline: 24px` を `padding-inline: 8px 40px` に変えて、左右で違う余白になることを確かめる(確かめたら戻す)
2. `html` タグに `dir="rtl"` を付けて(右から書く言語の設定)、1.の余白の左右が入れ替わることを確かめる(確かめたら外す)
3. `.card` の中に `position: relative` を書き、子に `position: absolute; inset: 0;` の空の `div` を置いて、開発者ツールでカード全体に重なっていることを確かめる

## 演習問題

### 問1(基本)

`margin-left: auto; margin-right: auto;` を論理プロパティ1行で書き直してください。

### 問2(基本)

`width: 640px;` を論理プロパティで書き直してください。

### 問3(基本)

`top: 0; right: 0; bottom: 0; left: 0;` を1行で書き直してください。

### 問4(応用)

横書きのページで `padding-block: 12px` が空ける余白はどこですか。1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
margin-inline: auto;
```

流れの向きの両端(横書きなら左右)をまとめて指定します。

</details>

<details>
<summary>問2の解答例</summary>

```css
inline-size: 640px;
```

幅は文字が進む向きの寸法なので、inline の語彙になります。

</details>

<details>
<summary>問3の解答例</summary>

```css
inset: 0;
```

位置指定の4辺の距離は `inset` でまとめられます。

</details>

<details>
<summary>問4の解答例</summary>

行が積み重なる向きの両端、つまり上下の余白です。

</details>

## 確認クイズ

### Q1. 日本語の横書きページで、inline が指す向きはどれですか。

- A. 左右(文字が進む向き)
- B. 上下(行が積み重なる向き)
- C. 画面の対角線

<details>
<summary>答え</summary>

**A** — inline は文字が進む向き、block は行が積み重なる向きです。

</details>

### Q2. `margin-inline: auto` と同じ意味になる従来の書き方はどれですか。

- A. margin: auto 0
- B. margin-left: auto; margin-right: auto;
- C. margin-top: auto; margin-bottom: auto;

<details>
<summary>答え</summary>

**B** — 横書きでは inline の両端が左右に対応します。

</details>

### Q3. `width` の論理版はどれですか。

- A. block-size
- B. inline-size
- C. inset-inline

<details>
<summary>答え</summary>

**B** — 幅は文字が進む向きの寸法なので `inline-size` です。`block-size` は `height` の論理版です。

</details>

### Q4. `inset: 0` が指定するのはどれですか。

- A. 4辺すべての距離を0にする
- B. 左だけ距離を0にする
- C. 内側の余白を0にする

<details>
<summary>答え</summary>

**A** — `inset` は位置指定の `top`・`right`・`bottom`・`left` のまとめ書きです。余白(padding)ではありません。

</details>

### Q5. 論理プロパティで書く利点はどれですか。

- A. 同じ指定でも表示が速くなる
- B. 書字方向が変わっても文章の向きに沿った指定のまま通用する
- C. 詳細度が上がって上書きに強くなる

<details>
<summary>答え</summary>

**B** — 物理的な上下左右ではなく文章の流れを基準にするので、縦書きや右から書く言語でも意図が保たれます。

</details>
