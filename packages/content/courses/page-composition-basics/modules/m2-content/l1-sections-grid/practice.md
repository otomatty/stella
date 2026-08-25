# レッスン2-1 演習 — 区画とカードの集合

対象トピック: 2-1-1 〜 2-1-4

## 手元で試す

レッスン1-2 の続きです。`main` の wrapper の中(`h1` と紹介文の下)に、カードの区画を足します。

```html
<section>
  <h2>今月の勉強会</h2>
  <div class="card-grid">
    <article class="card">
      <h3>TypeScript入門</h3>
      <p>毎週金曜の夕方に開催しています。</p>
      <a href="/events/ts">詳細を見る</a>
    </article>
    <article class="card">
      <h3>SQLでデータを読む会</h3>
      <p>実データを使って集計の練習をします。</p>
      <a href="/events/sql">詳細を見る</a>
    </article>
    <article class="card">
      <h3>アクセシビリティ勉強会はじめの一歩</h3>
      <p>読み上げソフトでの操作を体験します。</p>
      <a href="/events/a11y">詳細を見る</a>
    </article>
  </div>
</section>
```

`style.css` に、区画の間隔とカードの集合、そして部品講座のカードの CSS を足します。

```css
main .wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background-color: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-3);

  > * {
    margin-block: 0;
  }

  a {
    &:hover {
      color: var(--accent);
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}
```

保存して再読み込みし、次を確かめます。

1. ブラウザーの幅を広げたり狭めたりして、カードの列数が 3 → 2 → 1 と自動で変わる
2. 3 枚目のカードの見出しが 2 行になったとき、隣のカードの本文の高さがずれる(ガタつきを観察する)
3. 次の 4 行を足して、見出し・本文・リンクの行が隣のカードとそろうことを確かめる

```css
.card-grid > .card {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
}
```

## 演習問題

### 問1(基本)

本文に話題が 4 つあるとき、`main` と `section` をどう使い分けますか。1 文で答えてください。

### 問2(基本)

区画どうしの間隔 48px を、`section` ごとの `margin` ではなく親の `gap` で空ける CSS を書いてください(親は `main .wrapper` とします)。

### 問3(応用)

`grid-template-columns: repeat(3, 1fr)` と `repeat(auto-fill, minmax(220px, 1fr))` の違いを、画面の幅が狭くなったときの挙動で説明してください。

### 問4(応用)

subgrid のカードに書いた `grid-row: span 3` は何を意味しますか。1 文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`main` は 1 つのままにして、話題ごとに `h2` の見出しを持つ `section` で区切ります。

</details>

<details>
<summary>問2の解答例</summary>

```css
main .wrapper {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
```

実際のページでは `48px` を `var(--space-5)` のようにトークンで参照します。

</details>

<details>
<summary>問3の解答例</summary>

`repeat(3, 1fr)` は幅が狭くなっても 3 列のままでカードがつぶれます。`auto-fill + minmax` は列の最低幅(220px)を守れなくなると列数が減り、最後は 1 列まで畳まれるので、メディアクエリー無しで幅に追従します。

</details>

<details>
<summary>問4の解答例</summary>

カード 1 枚が親のグリッドの 3 行ぶん(見出し・本文・リンク)を使う、という指定です。その 3 行を `subgrid` で借りることで、行の高さが隣のカードと共有されます。

</details>

## 確認クイズ

### Q1. 本文の話題の区切り方として正しいのはどれですか。

- A. 話題ごとに `main` を増やす
- B. `h2` の見出しを持つ `section` で区切る
- C. `hr` を置いて区切る

<details>
<summary>答え</summary>

**B** — `main` は 1 つのまま、区切りは `main` の中で付けます。`section` と見出しはセットです。

</details>

### Q2. 見出しの無い `section` の問題点はどれですか。

- A. CSS が当たらなくなる
- B. 名前の無い区画になり、見出しの一覧から中身が分からない
- C. 表示が崩れる

<details>
<summary>答え</summary>

**B** — 区画の表札は `h2` です。見出しで移動する人には、名前の無い区画は中身を開くまで分かりません。

</details>

### Q3. 区画どうしの間隔を親の `gap` に集める利点はどれですか。

- A. 区画ごとに違う間隔を付けられる
- B. 区画を足しても消しても間隔が一定で、先頭と末尾に余計な余白が出ない
- C. `margin` より優先度が高い

<details>
<summary>答え</summary>

**B** — `gap` は間にだけ効きます。区画ごとの `margin` だと最後の区画の下にも余白が付き、書き忘れが区画の数だけ起きます。

</details>

### Q4. `repeat(auto-fill, minmax(220px, 1fr))` の説明として正しいのはどれですか。

- A. 常に 220px の列を 3 つ作る
- B. 最低 220px の列を幅に入るだけ作り、余りは等分する
- C. 220px を超えた列を非表示にする

<details>
<summary>答え</summary>

**B** — 幅に入るだけ列を作るのが `auto-fill`、最低幅と余りの配り方が `minmax(220px, 1fr)` です。列数はメディアクエリー無しで変わります。

</details>

### Q5. subgrid を使う目的はどれですか。

- A. カードの中の行の高さを、親の行に乗せて隣のカードとそろえる
- B. カードの列数を増やす
- C. カードの HTML を減らす

<details>
<summary>答え</summary>

**A** — 高さの持ち主をカードから親のグリッドへ移すことで、行の高さが列をまたいで共有されます。使うかどうかは任意の上積みです。

</details>
