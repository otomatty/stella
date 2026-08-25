# レッスン2-2 演習 — 一覧・フォーム・FAQ

対象トピック: 2-2-1 〜 2-2-3

## 手元で試す

レッスン2-1 の続きです。カードの区画の下に、更新情報・参加申し込み・よくある質問の 3 区画を足します。

```html
<section>
  <h2>更新情報</h2>
  <ul class="update-list">
    <li>
      <div class="media">
        <img src="./avatar.png" alt="" width="48" height="48" />
        <div class="media-body">
          <p><strong>佐藤</strong> が「TypeScript入門」の資料を更新しました</p>
        </div>
      </div>
    </li>
    <li>
      <div class="media">
        <img src="./avatar.png" alt="" width="48" height="48" />
        <div class="media-body">
          <p><strong>田中</strong> が「SQLでデータを読む会」の日程を変更しました</p>
        </div>
      </div>
    </li>
  </ul>
</section>

<section>
  <h2>参加申し込み</h2>
  <form class="signup">
    <div class="field">
      <label for="name">名前</label>
      <input id="name" name="name" type="text" />
    </div>
    <div class="field">
      <label for="email">メールアドレス</label>
      <input id="email" name="email" type="email" />
    </div>
    <button type="submit">申し込む</button>
  </form>
</section>

<section>
  <h2>よくある質問</h2>
  <details>
    <summary>参加費はかかりますか?</summary>
    <p>無料です。教材費もかかりません。</p>
  </details>
  <details>
    <summary>途中参加はできますか?</summary>
    <p>できます。次の回からご参加ください。</p>
  </details>
</section>
```

`style.css` に、一覧の積み方とフォームの幅、部品講座のメディアオブジェクトと `.field` の CSS を足します(部品の CSS は手元のものがあればそのままで、無ければ次の最小版を使ってください)。

```css
.update-list {
  list-style: none;
  padding-inline-start: 0;
  margin-block: 0;

  > li {
    padding-block: var(--space-3);
  }

  > li + li {
    border-block-start: 1px solid var(--line);
  }
}

.media {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;

  p {
    margin-block: 0;
  }
}

.signup {
  max-inline-size: 40rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-block-end: var(--space-3);

  input {
    box-sizing: border-box;
    inline-size: 100%;
    font: inherit;
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-1);

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}
```

`avatar.png` は 48×48 程度の適当な画像を同じフォルダに置いてください(無ければ `img` を外してもかまいません)。保存して、次を確かめます。

1. 更新情報の 2 件目の上にだけ区切り線が付いている(先頭には付かない)
2. ブラウザーを広げても、入力欄が 40rem で止まり、見出しと左端がそろったままになっている
3. FAQ を閉じたまま `summary` だけ読んで、どの質問か分かる文になっているか見直す

## 演習問題

### 問1(基本)

カードは格子に敷き詰め、更新情報は縦に積みました。集合の形をどう選び分けましたか。1 文で答えてください。

### 問2(基本)

一覧の 2 件目以降にだけ区切り線を引く CSS を、`+` を使って書いてください(親は `.update-list`、子は `li` とします)。

### 問3(応用)

フォームの幅を絞るのに、`.field` それぞれではなく `form` に `max-inline-size` を 1 つ当てるのはなぜですか。

### 問4(応用)

FAQ の `summary` に「その1」「詳細はこちら」と書くのが良くない理由を 1 文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

読み順が上から下へ 1 本の時系列の一覧は縦積み、順不同で見比べる集合は格子、と中身の性質で選びました。

</details>

<details>
<summary>問2の解答例</summary>

```css
.update-list > li + li {
  border-block-start: 1px solid var(--line);
}
```

`+` は直後の要素だけに当たるので、直前の兄弟がいない最初の `li` には線が付きません。

</details>

<details>
<summary>問3の解答例</summary>

中の `.field` は幅 100% で作ってあるので、`form` の幅を 1 か所絞ればすべての入力欄がその幅に収まり、部品の CSS に触らずに済むからです。

</details>

<details>
<summary>問4の解答例</summary>

`summary` は閉じたまま質問の一覧として読まれるので、開かないと意味の分からない見出しでは拾い読みが成立しません。

</details>

## 確認クイズ

### Q1. 更新情報のような時系列の一覧に合う並べ方はどれですか。

- A. `repeat(auto-fill, minmax())` の格子
- B. メディアオブジェクトの縦積み
- C. 横スクロールの 1 行

<details>
<summary>答え</summary>

**B** — 読み順が上から下へ 1 本なので縦積みが合います。格子は順不同で見比べる集合(カード)向きです。

</details>

### Q2. `.update-list > li + li` に区切り線を当てると、線はどこに付きますか。

- A. すべての `li` の上
- B. 2 件目以降の `li` の上
- C. 最後の `li` の下

<details>
<summary>答え</summary>

**B** — `+` は直後の要素だけに当たるため、直前の兄弟がいない先頭の `li` には付きません。

</details>

### Q3. フォームを区画に載せるときの幅の扱いとして正しいのはどれですか。

- A. wrapper の幅いっぱいに伸ばす
- B. `form` に `max-inline-size` を当てて読みやすい幅に絞る
- C. `margin-inline: auto` で中央に寄せる

<details>
<summary>答え</summary>

**B** — 全幅の入力欄は間のびして使いにくく、中央寄せは見出しと左端がずれます。左端をそろえたまま幅だけ絞ります。

</details>

### Q4. FAQ に `details` を使う利点はどれですか。

- A. JavaScript なしで、質問だけの一覧から読みたい答えだけ開ける
- B. 答えを検索エンジンから隠せる
- C. 質問の数を減らせる

<details>
<summary>答え</summary>

**A** — 閉じた状態の `summary` の並びがそのまま質問の一覧になります。開閉はブラウザーが持っています。

</details>
