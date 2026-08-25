# レッスン3-2 フォーム部品の見た目

## このレッスンの目標

- [ ] ラベルと入力欄を 1 組にして縦に積める
- [ ] 入力欄の既定の見た目を、書体の継承とトークンで当て直せる
- [ ] フォーカス・選択済み・操作不可の状態を描き分けられる

## 3-2-1 1行1組で縦に積む

> **フォームはラベルと入力欄を1組にして、縦に積んで並べる**

前のレッスンで作った骨格に、ここから見た目を当てます。2 段階目のレイアウトです。

フォームは「上から順に埋める」形がいちばん迷いません。そのために、**ラベルと入力欄を 1 組にまとめてから積みます**。

```html
<div class="field">
  <label for="dept">部署</label>
  <select id="dept" name="dept">…</select>
</div>

<div class="field">
  <label for="body">備考</label>
  <textarea id="body" name="body" rows="5"></textarea>
</div>
```

```css
form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

積む指定が 2 段になっているのがポイントです。

- 外側(`form`)の `gap` … 組と組の間隔。広め
- 内側(`.field`)の `gap` … ラベルと入力欄の間隔。狭め

間隔に差を付けると、「このラベルはこの入力欄のもの」というまとまりが目で分かります。近いものは関係が強い、というのは見た目の基本です。

`fieldset` も 1 つの組として同じように扱えます。中のラジオボタンは、さらに小さな `gap` で積んでください。

## 3-2-2 既定の見た目を他の部品にそろえる

> **入力欄は既定の見た目を持つので、書体を継承させてトークンで枠を当て直す**

3 段階目です。フォーム部品には、カードやナビには無い癖があります。**ブラウザーが独自の見た目を持っている**ことです。

いちばん目立つのが書体です。`body` にどんな `font-family` を指定しても、`input` や `textarea` の中の文字はブラウザーの既定のままになります。ここだけ書体が違って見えるのはこのためです。

```css
input,
select,
textarea,
button {
  font: inherit;
  color: inherit;
}
```

`font: inherit` が **書体の継承** です。親の書体・大きさ・行間をそのまま受け継ぎます。フォームを書くときの決まり文句として覚えてください。

書体をそろえたら、枠と余白をトークンで当て直します。

```css
.field :is(input, select, textarea) {
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: var(--radius-1);
  padding: var(--space-2);
  background-color: var(--surface);
  inline-size: 100%;
}
```

`:is(...)` は、かっこの中のどれかに当たるという書き方です。3 つのセレクタを並べて書くより短く済みます。

`box-sizing: border-box` を忘れないでください。入力欄の既定は `content-box` で、この場合の `inline-size: 100%` は **中身の領域だけ** が 100% になり、そこに `padding` と枠の太さが足されます。結果として入力欄が `.field` の幅からはみ出し、横スクロールが出ます。`border-box` にすると、`padding` と枠を含めて 100% になります。

他の部品と **同じトークン** を使うので、カードやボタンと自然にそろいます。ここで `--line` ではない別の色を持ち出すと、フォームだけ浮いて見えます。

なお `select` の内部(開いたときの選択肢のリスト)を細かく書式化する機能は、まだ広く使える段階にありません。枠と書体をそろえるところまでに留めます。

## 3-2-3 フォーカスは:focus-visibleで出す

> **入力欄のフォーカスは、枠を消したままにせず:focus-visibleで出し直す**

4 段階目の状態です。フォームでは、フォーカスがいちばん大事な状態になります。長いフォームほど「いまどこを入力しているか」が命綱だからです。

やってはいけないのが、既定の枠が見た目に合わないからと消して終わることです。

```css
/* これで手を止めない */
input:focus {
  outline: none;
}
```

消してよいのは、**代わりを用意したとき** だけです。

```css
.field :is(input, select, textarea) {
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}
```

`outline: none` を書かずに `:focus-visible` の指定だけを足せば、必要なときにだけ自分の枠が出ます。

枠の代わりに使える表現もいくつかあります。

- `outline` の色と太さを変える(いちばん素直)
- `border-color` を変えて、枠自体を強調する
- 影を付けて、入力欄を浮かせる

どれを選んでも構いませんが、**背景色をわずかに変えるだけ**の表現は弱いので避けてください。

## 3-2-4 選択と操作不可を状態で描く

> **選ばれている・操作できないという状態は、:checkedと:disabledで見た目を変える**

フォームにはフォーカス以外にも状態があります。よく使う 2 つを見ます。

**`:checked`** は、ラジオボタンやチェックボックスが選ばれているときに当たります。

```css
input:checked + label {
  font-weight: 600;
  color: var(--accent);
}
```

`+` は直後の要素を指す結合子です。この書き方だと、選ばれた入力の **隣のラベルだけ** が変わります。小さな丸の塗りつぶしに加えて文字も変わるので、選んだ結果がはっきり分かります(HTML が `input` → `label` の順に並んでいることが前提です)。

**`:disabled`** は、`disabled` 属性が付いていて操作できないときに当たります。

```css
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

薄くして「いまは押せない」と伝えます。`display: none` で消してしまうと、条件が揃えば押せるボタンだということ自体が分からなくなるので、**隠すより薄く残す**ほうが親切です。

これでフォーム部品が 4 段階そろいました。骨格は前のレッスン、レイアウト・トークン・状態がこのレッスンです。

## もっと知りたい人へ

- [フォームへのスタイル設定(MDN)](https://developer.mozilla.org/ja/docs/Learn_web_development/Extensions/Forms/Styling_web_forms)
- [`:checked`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/:checked) / [`:disabled`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/:disabled)
- [`:is()`(MDN)](https://developer.mozilla.org/ja/docs/Web/CSS/:is)

---

演習は [practice.md](practice.md) にあります。
