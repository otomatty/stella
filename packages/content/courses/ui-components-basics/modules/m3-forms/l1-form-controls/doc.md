# レッスン3-1 フォーム部品の骨格

## このレッスンの目標

- [ ] `select` / `textarea` / ラジオボタン / チェックボックスを使い分けられる
- [ ] 関連する入力を `fieldset` と `legend` でまとめられる
- [ ] フォームの中の `button` に正しい `type` を書ける

## 3-1-1 selectは選択肢から選ばせる

> **selectは、optionで並べた選択肢から1つ選ばせる入力部品**

「部署」を自由入力にすると、「開発」「開発部」「開発G」と表記がゆれて集計できません。決まった候補から選ばせたいときに使うのが `select` です。

```html
<label for="dept">部署</label>
<select id="dept" name="dept">
  <option value="dev">開発</option>
  <option value="sales">営業</option>
  <option value="hr">人事</option>
</select>
```

- `value` … 送信される値
- タグの間のテキスト … 画面に出る文字
- `label` の `for` と `select` の `id` … 対応させることで、ラベルが入力欄の名前になり、ラベルを押しても入力欄が反応する(押せる範囲が広がる)

選択肢が多いときは `optgroup` で束ねられます。

```html
<select id="dept" name="dept">
  <optgroup label="技術">
    <option value="dev">開発</option>
    <option value="qa">品質保証</option>
  </optgroup>
</select>
```

`optgroup` の見出し自体は選べません。選択肢が 20 を超えるようなら、グループに分けると探しやすくなります。

なお、`select` の中身を細かく書式化する機能は、まだ広く使える段階にありません。この講座では **既定の見た目を活かす** 方針で扱います。

## 3-1-2 textareaは複数行を書かせる

> **textareaは複数行の入力欄で、初期値は開始タグと終了タグの間に書く**

問い合わせ本文や備考のように、改行を含む長い文章を書かせる欄は `input` では作れません。`textarea` を使います。

```html
<label for="body">お問い合わせ内容</label>
<textarea id="body" name="body" rows="5"></textarea>
```

`rows` は最初に見える行数です。書き間違えやすいのは **初期値の書き方** で、`input` とは違います。

- `input` … 1 行。初期値は `value` 属性に書く
- `textarea` … 複数行。初期値は開始タグと終了タグの **間** に書く

```html
<textarea id="body" name="body">ここが初期値になる</textarea>
```

タグの間に入れた改行や空白も、そのまま初期値になります。HTML を読みやすく整形しようとして改行を入れると、意図しない空白が初期値に入ります。空にしたいときは、開始タグと終了タグを続けて書いてください。

## 3-1-3 radioは1つ、checkboxは複数

> **同じnameのラジオボタンは1つだけ選べ、チェックボックスはそれぞれ独立して選べる**

選ばせる部品の使い分けは、**いくつ選ばせたいか** だけで決まります。

- 1 つだけ選ばせたい → `type="radio"`(**ラジオボタン**)
- いくつでも選ばせたい → `type="checkbox"`(**チェックボックス**)

```html
<input type="radio" id="on" name="place" value="on">
<label for="on">出社</label>

<input type="radio" id="off" name="place" value="off">
<label for="off">在宅</label>
```

ラジオボタンで大事なのは `name` です。**`name` が同じもの同士でグループ**になり、その中の 1 つだけが選べます。`id` と `for` は 1 つずつ対応させる別の役割なので、混同しないでください。

「どちらか一方のはずなのに両方選べる」という不具合は、ほとんどの場合 `name` がばらばらになっているのが原因です。1 つしか選べないはずの場所で両方選べたら、まず `name` を疑ってください。

チェックボックスは 1 つずつ独立しているので、`name` が同じでも複数選べます(送信時に同じ名前で複数の値が送られます)。

## 3-1-4 fieldsetで関連する入力をまとめる

> **関連する入力はfieldsetで囲み、legendでそのまとまりの見出しを付ける**

前のトピックのラジオボタンには、まだ足りないものがあります。読み上げると「出社、ラジオボタン」「在宅、ラジオボタン」としか言われず、**何を聞かれているのか** が分かりません。選択肢ごとの `label` はありますが、質問文にあたる見出しがないからです。

```html
<fieldset>
  <legend>勤務地</legend>

  <input type="radio" id="on" name="place" value="on">
  <label for="on">出社</label>

  <input type="radio" id="off" name="place" value="off">
  <label for="off">在宅</label>
</fieldset>
```

- `fieldset` … 関連する入力のまとまり
- `legend` … そのまとまりの見出し。`fieldset` の **最初の子** として書く

これで「勤務地、出社、ラジオボタン」と、質問とセットで読み上げられます。

使いどころの目安です。

- ラジオボタン・チェックボックスのグループ … ほぼ必須
- 住所や氏名など、意味のまとまりがある入力の集まり … 使うと分かりやすい
- 入力が 1 つだけ … `label` で足りるので不要

## 3-1-5 buttonのtypeを書き分ける

> **フォームの中のbuttonは、送信ならsubmit、それ以外はtypeをbuttonにする**

「行を追加」を押しただけでフォームが送信されてしまった、という不具合があります。原因は属性 1 つです。

**`form` の中の `button` は、`type` を省くと `submit` として扱われます。**

```html
<form action="/contact" method="post">
  <button type="submit">送信する</button>
  <button type="button">入力例を見る</button>
</form>
```

2 つ目に `type="button"` が無いと、押した瞬間にフォームが送信されます。

| 値 | 何が起きるか |
| --- | --- |
| `submit` | フォームを送信する(既定) |
| `reset` | 入力内容を初期値に戻す |
| `button` | 何も起きない |

`reset` は入力を消してしまい、押し間違いの被害が大きいので、実務で使う場面はほとんどありません。

前のレッスンで見た `a` との使い分けも思い出してください。**別のページへ移動するなら `a`、そのページで何かを起こすなら `button`** です。

## もっと知りたい人へ

- [フォームの構築(MDN)](https://developer.mozilla.org/ja/docs/Learn_web_development/Extensions/Forms/Your_first_form)
- [`select`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/select) / [`textarea`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/textarea)
- [`fieldset`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/fieldset) / [`button`(MDN)](https://developer.mozilla.org/ja/docs/Web/HTML/Element/button)

---

演習は [practice.md](practice.md) にあります。
