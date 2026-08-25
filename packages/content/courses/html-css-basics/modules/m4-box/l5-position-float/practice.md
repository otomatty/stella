# レッスン4-5 演習 — 位置指定と浮動

対象トピック: 4-5-1 〜 4-5-3

## 手元で試す

`index.html` の `main` に、次を足します。

```html
<div class="card">
  <span class="badge">新着</span>
  <h2>4月研修のお知らせ</h2>
  <p>4月10日に開催します。</p>
</div>
```

`style.css` に次を足して保存し、再読み込みしてください。

```css
.card {
  position: relative;
  border: 1px solid gray;
  padding: 16px;
}

.badge {
  position: absolute;
  top: 8px;
  right: 8px;
}
```

「新着」がカードの右上に重なれば成功です。書けたら、次の改造をしてみましょう。

1. `.card` の `position: relative;` を消して保存し、ラベルが画面の右上へ飛ぶことを確かめる(確かめたら戻す)
2. `.badge` を `position: relative; top: 4px;` に変えて、元の場所が空いたまま少し下がることを確かめる(確かめたら戻す)
3. 画像を1枚置き、`float: left; margin-right: 16px;` を当てて、段落が回り込むことを確かめる
4. `float` の値を `right` に変えて、回り込む向きが変わることを確かめる

## 演習問題

### 問1(基本)

`position: relative` と `margin` で要素をずらしたときの違いを1文で書いてください。

### 問2(基本)

カードの右上に重ねたラベルが、画面の右上に表示されてしまいました。まず疑うところはどこですか。

### 問3(応用)

`position: absolute` を指定した要素が通常フローから抜けると、周りの要素はどうなりますか。

### 問4(応用)

「横並びのレイアウトを float で作った」と書かれた古い記事を見つけました。いまはどうするべきですか。1文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`margin` は隣を押しのけて周りも動きますが、`position: relative` は元の場所を空けたまま自分だけがずれます。

</details>

<details>
<summary>問2の解答例</summary>

基準にしたい親に `position: relative` が書かれているかを疑います。無いとページ全体が基準になります。

</details>

<details>
<summary>問3の解答例</summary>

元の場所は空かず、周りの要素は詰めて並び直します。

</details>

<details>
<summary>問4の解答例</summary>

段組みは Flex か Grid で作ります。float は文章の回り込みだけに使います。

</details>

## 確認クイズ

### Q1. 元の場所を残したまま、自分だけをずらす指定はどれですか。

- A. position: relative
- B. position: absolute
- C. float: left

<details>
<summary>答え</summary>

**A** — relative は場所を保ったまま見た目だけをずらします。周りは動きません。

</details>

### Q2. position: absolute の基準になるのはどれですか。

- A. 必ずページ全体
- B. position が static 以外の、いちばん近い先祖
- C. すぐ上に書かれた要素

<details>
<summary>答え</summary>

**B** — 実務では基準にしたい親に position: relative を書きます。

</details>

### Q3. 通常フローとは何ですか。

- A. 書いた順に上から積まれていく、既定の並び
- B. Flex で並べたときの並び
- C. 画面幅に合わせて変わる並び

<details>
<summary>答え</summary>

**A** — position: absolute はこの流れから抜けるので、重なりを作れます。

</details>

### Q4. float の使いどころとして正しいものはどれですか。

- A. ページの段組みを作る
- B. 文章を画像に回り込ませる
- C. 要素を画面に貼り付ける

<details>
<summary>答え</summary>

**B** — 段組みは Flex か Grid を使います。float は回り込み専用と考えてください。

</details>

### Q5. float を指定した画像に margin を添えるのはなぜですか。

- A. 回り込みを有効にするため
- B. 文字が画像にくっつくのを避けるため
- C. 画像の位置を固定するため

<details>
<summary>答え</summary>

**B** — float と margin は組で使います。

</details>
