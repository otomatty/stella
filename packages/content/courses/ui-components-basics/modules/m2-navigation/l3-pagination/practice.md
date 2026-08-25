# レッスン2-3 演習 — ページネーション

対象トピック: 2-3-1 〜 2-3-4

## 手元で試す

`index.html` の一覧の下に、ページ送りを置きます。

```html
<nav class="pagination" aria-label="ページ送り">
  <ol>
    <li><a href="?page=2">前へ</a></li>
    <li><a href="?page=1">1</a></li>
    <li><a href="?page=2">2</a></li>
    <li><span aria-current="page">3</span></li>
    <li><a href="?page=4">4</a></li>
    <li><a href="?page=4">次へ</a></li>
  </ol>
</nav>
```

`style.css` に次を足します。

```css
.pagination ol {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  list-style: none;
  padding: 0;
}

.pagination a,
.pagination [aria-current="page"] {
  display: grid;
  place-items: center;
  min-inline-size: 44px;
  min-block-size: 44px;
  border-radius: var(--radius-1);
  text-decoration: none;
}

.pagination [aria-current="page"] {
  background-color: var(--accent);
  color: var(--surface);
  font-weight: 600;
}

.pagination a {
  &:hover { background-color: var(--surface-2); }
  &:focus-visible { outline: 2px solid var(--accent); }
}
```

`--surface-2` と `--radius-1` をまだ定義していなければ、`:root` に足してください(レッスン1-1 のトークン一覧にあります)。番号が中央に並び、3 だけが塗りつぶされていれば成功です。書けたら、次の改造をしてみましょう。

1. `justify-content` を `flex-end` に変えて、並びが右端に寄ることを確かめる
2. 番号を 20 個まで増やし、ウィンドウを狭くして折り返ることを確かめる
3. `aria-current="page"` を別の番号に付け替えて、塗りつぶしが移ることを確かめる

## 演習問題

### 問1(基本)

ページ送りの番号を `button` ではなく `a` で書くのはなぜですか。

### 問2(基本)

番号の並びを中央に置くための 1 行を書いてください。

### 問3(応用)

`min-inline-size` と `inline-size` のどちらを使うべきですか。理由も 1 文で答えてください。

### 問4(応用)

現在のページを塗りつぶすだけでは足りないのはなぜですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

別のページへ移動する操作だからです。`a` なら新しいタブで開いたり URL を共有したりもできます。

</details>

<details>
<summary>問2の解答例</summary>

```css
justify-content: center;
```

親の flex コンテナに書きます。

</details>

<details>
<summary>問3の解答例</summary>

`min-inline-size` です。下限だけを決めておけば、「10」のように中身が長い番号でもはみ出さずに広がります。

</details>

<details>
<summary>問4の解答例</summary>

色だけの手がかりなので、読み上げには伝わらないからです。`aria-current="page"` の印をセットで付けます。

</details>

## 確認クイズ

### Q1. ページネーションの骨格として適切なものはどれですか。

- A. `nav` の中の `ol` に、前後と番号のリンクを並べる
- B. `div` の中に `button` を並べる
- C. `select` で番号を選ばせる

<details>
<summary>答え</summary>

**A** — 番号には順序があるので `ol` を使い、移動の操作なので `a` を使います。

</details>

### Q2. 番号の並びの位置を決めるプロパティはどれですか。

- A. `align-items`
- B. `justify-content`
- C. `text-align`

<details>
<summary>答え</summary>

**B** — 並びの方向にそって、どこへ置くかを決めます。中身の位置は親が決めます。

</details>

### Q3. `min-block-size: 44px` を当てる目的はどれですか。

- A. 指でも押しやすい当たり判定を確保するため
- B. 文字を 44px にするため
- C. 44 ページ以上を表示しないため

<details>
<summary>答え</summary>

**A** — 文字の大きさに任せず、部品側で押せる大きさの下限を決めます。

</details>

### Q4. 現在のページの項目はどう書きますか。

- A. リンクのままにして色を変える
- B. リンクを外し、`aria-current="page"` を付ける
- C. HTML から削除する

<details>
<summary>答え</summary>

**B** — 押しても何も起きない操作を残さず、現在地は印で伝えます。

</details>

### Q5. ページ数が多いときに `flex-wrap: wrap` を入れておく理由はどれですか。

- A. 番号の順番が入れ替わるのを防ぐため
- B. 狭い画面で横スクロールを出さずに折り返すため
- C. 現在のページを自動で中央に寄せるため

<details>
<summary>答え</summary>

**B** — はみ出して横スクロールが出るより、2 行に折り返したほうが読めます。

</details>
