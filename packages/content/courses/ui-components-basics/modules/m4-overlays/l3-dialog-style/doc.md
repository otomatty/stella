# レッスン4-3 ダイアログの見た目

## このレッスンの目標

- [ ] ダイアログの幅と位置を、上限と自動マージンで決められる
- [ ] 中身を他の部品と同じトークンで組み、`display` を `[open]` に限れる
- [ ] 背面の暗さを `::backdrop` で指定できる

## 4-3-1 幅と位置は論理プロパティで決める

> **ダイアログの幅と位置は、max-inline-sizeとmargin: autoで決める**

前のレッスンで開くところまで作りました。ここからは見た目です。2 段階目のレイアウトから始めます。

何も指定しないと、ダイアログの幅は中身の量に振り回されます。短い確認文なら細く、長い文章なら画面いっぱいに広がります。かといって `inline-size: 480px` と固定すると、狭い画面ではみ出します。

**上限だけを決める**のが答えです。

```css
dialog {
  box-sizing: border-box;
  max-inline-size: 32rem;
  inline-size: calc(100% - 2rem);
  margin: auto;
}
```

- `box-sizing: border-box` … 幅の計算に `padding` と枠を含める
- `max-inline-size: 32rem` … 広い画面でも、これ以上は広がらない
- `inline-size: calc(100% - 2rem)` … 狭い画面では、左右に 1rem ずつ余白を残した幅になる
- `margin: auto` … 上下左右の余りが均等に分かれ、画面の中央に来る

`box-sizing` を忘れると、フォーム部品のときと同じことが起きます。既定の `content-box` では `calc(100% - 2rem)` が **中身の領域だけ** の幅になり、そこにこのあと足す `padding` と枠が外側から加わります。狙った 1rem の余白が消え、狭い画面でははみ出します。

モーダルのダイアログはポップオーバーと同じく最前面に出るので、この `margin: auto` が画面に対して効きます。親要素の位置は関係ありません。

中身が長いときのために、縦にも上限を付けておきます。

```css
dialog {
  max-block-size: 80dvh;
  overflow: auto;
}
```

`dvh` は画面の高さを表す単位です。上限を超えた分は **ダイアログの中** でスクロールします。ページ全体がスクロールしてしまう、という状態を避けられます。

## 4-3-2 中身はトークンで組む

> **ダイアログの余白・境界・角丸は、他の部品と同じトークンで当てる**

3 段階目です。もう見慣れた 4 行を当てます。

```css
dialog {
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-3);
  background-color: var(--surface);
}
```

カード・`details`・ポップオーバーと **まったく同じトークン** です。前面に出る部品ほど、ページとの一体感が要ります。ここで新しい値を持ち出すと、ダイアログだけ別のサイトから来たように見えます。

中身の積み方も、カードと同じ型が使えます。ただし **`display` を書く相手だけは `dialog` ではなく `dialog[open]`** にします。

```css
dialog[open] {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

dialog > * {
  margin-block: 0;
}
```

見出し・本文・ボタンを縦に積み、間隔は親の `gap` に集めます。カードのときと同じく、**既定の margin を 0 にしてから** `gap` で決めます(フレックスアイテムどうしでは margin が相殺されないので、残したままだと `gap` に足された不揃いな間隔になります)。

なぜ `[open]` が要るのでしょうか。閉じている `dialog` が表示されないのは、ブラウザーが `dialog:not([open]) { display: none; }` という指定を持っているからです。ところが **自分で書いた CSS はブラウザーの指定より優先されます**。`dialog { display: flex; }` と書くと `display: none` が打ち消され、**閉じているはずのダイアログがページに出たまま**になります。

`dialog[open]` に限れば、開いている間だけ flex になり、閉じている間はブラウザーの指定がそのまま効きます。レッスン3-3 の `details[open]` と同じ、**開いている状態を属性セレクタで選ぶ**形です。

枠・余白・背景の指定(前のコードブロック)は `display` を変えないので、`dialog` に直接書いて構いません。ボタンを横に並べたいときは、ボタンだけを 1 つの箱にまとめてください。

```css
dialog .actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
```

`justify-content: flex-end` でボタンを終端側に寄せます。ページネーションで使った指定と同じです。

## 4-3-3 背面の暗さは::backdrop

> **モーダルの背面の暗さは::backdropで指定する**

最後は背面です。ダイアログと背面のページが同じ明るさだと、どちらを見ればいいのか迷います。背面を暗くして、前面に視線を集めます。

暗い面のために `div` を 1 枚足す必要はありません。前面の要素の後ろには、**`::backdrop`** という面が自動で敷かれます。

```css
dialog::backdrop {
  background-color: oklch(0% 0 0 / 0.5);
}
```

`oklch(0% 0 0 / 0.5)` は黒の半透明です。最後の数字が透け具合で、上げるほど背面が暗くなります。

濃さの加減には注意してください。

- 濃すぎる … 背面がまったく見えず、どこから来たのか分からなくなる
- 薄すぎる … 前面との差が付かず、暗くした意味がない
- 目安 … 半分前後

`::backdrop` は、**モーダルで開いたときだけ** 現れます。ポップオーバーでも同じ書き方が使えます。

これで、この講座で扱う部品がすべて 4 段階そろいました。カードから始めて、ナビゲーション、フォーム、開閉、そして重ねて出す部品まで、どれも **HTML 骨格 → レイアウト → トークン → 状態** の順で作ってきました。新しい部品に出会ったときも、この順番で 1 つずつ進めてください。

## もっと知りたい人へ

- [`::backdrop`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/::backdrop)
- [`dialog`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/dialog)
- [`max-inline-size`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/max-inline-size)

---

演習は [practice.md](practice.md) にあります。
