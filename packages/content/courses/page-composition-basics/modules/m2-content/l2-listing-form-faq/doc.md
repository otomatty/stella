# レッスン2-2 一覧・フォーム・FAQ

## このレッスンの目標

- [ ] 時系列の一覧を、メディアオブジェクトの縦積みで組める
- [ ] フォームを区画に載せ、幅だけを読みやすく絞れる
- [ ] FAQ を `details` の並びで組み、質問文を一覧として書ける

## 2-2-1 更新情報はメディアオブジェクトで積む

> **更新情報の一覧は、メディアオブジェクトを縦に積んで区切り線で区切る**

2 つ目の区画は「更新情報」です。「誰がいつ何を更新したか」の 1 件ぶんは、画像(アイコン)と本文が横に並ぶ形——部品講座で作った **メディアオブジェクト** そのものです。部品はあるので、決めるのは何件も並べるときの積み方だけです。

カードは格子に敷き詰めましたが、更新情報は時系列の **一覧** です。読み順が上から下へ 1 本なので、格子ではなく縦積みが合います。そして件と件の境目は、余白だけでなく区切り線で示します。

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
      <div class="media">…</div>
    </li>
  </ul>
</section>
```

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
```

並んだ項目なので `ul` と `li` で書き、`li` の中にメディアオブジェクトを 1 件ずつ入れます。区切り線は `> li + li` に当てます。`+` は **直後の要素だけ** に当たるセレクタでした。最初の `li` には直前の兄弟がいないので線が付かず、2 件目以降の上にだけ線が引かれます。「先頭にだけ線を付けない」を条件分岐なしで書ける、定番の使い方です。

## 2-2-2 フォームの幅は読みやすく絞る

> **申し込みフォームは区画にそのまま載せ、幅はmax-inline-sizeで読みやすく絞る**

3 つ目の区画は「参加申し込み」です。ラベルと入力欄の組(`.field`)や送信ボタンは部品講座で作ってあるので、`form` ごと区画に載せます。

そのまま載せると 1 つ問題が出ます。入力欄は幅 100% で作ってあるので、wrapper の幅 960px いっぱいまで伸びてしまうことです。全幅の入力欄は視線の移動が長く、間のびして使いにくくなります。本文の 1 行の長さを `ch` で抑えたのと同じ理屈で、読み書きする幅は本文の幅とは別に決めます。

```css
.signup {
  max-inline-size: 40rem;
}
```

```html
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
```

絞るのは **フォーム全体の 1 か所**です。`form` に上限幅を 1 つ当てれば、中の `.field` は幅 100% で作ってあるので全員がその幅に収まります。部品の CSS には触りません。

もう 1 つ、フォームだけ `margin-inline: auto` で中央に置かないことにも注意してください。中央に寄せると、見出しや本文の左端とラインがずれます。中央寄せはページの単位(wrapper)の仕事、区画の中では左端をそろえたまま幅だけ絞ります。

## 2-2-3 FAQはdetailsを並べて作る

> **FAQの区画は、detailsを縦に並べて質問ごとに開閉できるようにする**

本文最後の区画は「よくある質問」です。質問と答えの組が何組も並びますが、答えまで全部見せると区画が縦に長くなりすぎます。FAQ の読み方は拾い読みなので、「質問だけ一覧して、読みたい答えだけ開く」形が合います。

JavaScript なしで開閉できる部品は、部品講座の `details` でした。質問文を `summary` に、答えを中身に入れて、質問の数だけ縦に並べます。

```html
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

閉じた状態の `summary` の並びが、そのまま **質問の一覧** になります。だから質問文の書き方が大事です。

- `summary` は閉じたまま読まれる。**1 行で意味が通る質問文**にする
- 「その 1」「詳細はこちら」のような、開かないと分からない見出しは付けない
- 答えの中身は複数の段落になってもよい

見た目は、部品講座で `details` に当てたトークンの CSS(枠・余白・`::marker` の置き換え・`[open]` の見た目)がそのまま効きます。ここでも部品には触らず、並べただけです。

これで本文の区画は「今月の勉強会」「更新情報」「参加申し込み」「よくある質問」の 4 つがそろいました。区画どうしの間隔が 2-1-2 の `gap` 1 か所で決まっていることを、あらためて確認してください。

## もっと知りたい人へ

- [Media objects(MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook/Media_objects)
- [`details`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/details)
- [`max-inline-size`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/max-inline-size)

---

演習は [practice.md](practice.md) にあります。
