# レッスン3-1 演習 — フォーム部品の骨格

対象トピック: 3-1-1 〜 3-1-5

## 手元で試す

`index.html` に、申し込みフォームの骨格を置きます。CSS はまだ当てません。

```html
<form action="/apply" method="post">
  <label for="dept">部署</label>
  <select id="dept" name="dept">
    <option value="dev">開発</option>
    <option value="sales">営業</option>
  </select>

  <fieldset>
    <legend>勤務地</legend>
    <input type="radio" id="on" name="place" value="on">
    <label for="on">出社</label>
    <input type="radio" id="off" name="place" value="off">
    <label for="off">在宅</label>
  </fieldset>

  <label for="body">備考</label>
  <textarea id="body" name="body" rows="5"></textarea>

  <button type="submit">申し込む</button>
  <button type="button">入力例を見る</button>
</form>
```

ブラウザーで開いて、次を確かめてください。

1. 「出社」を選んでから「在宅」を選ぶと、出社の選択が外れる
2. `name="place"` の片方を `name="place2"` に変えると、両方選べるようになる(確かめたら戻す)
3. 「入力例を見る」から `type="button"` を消して押すと、ページが送信されてしまう(確かめたら戻す)

## 演習問題

### 問1(基本)

「希望する研修(複数選択可)」を作るとき、`radio` と `checkbox` のどちらを使いますか。

### 問2(基本)

`textarea` の初期値はどこに書きますか。`input` との違いを含めて答えてください。

### 問3(応用)

ラジオボタンのグループに `fieldset` と `legend` を付けると、何が改善しますか。

### 問4(応用)

フォームの中に「入力例を挿入する」ボタンを置きます。書くべき `type` と、その理由を答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`checkbox` です。チェックボックスは 1 つずつ独立しているので、いくつでも選べます。

</details>

<details>
<summary>問2の解答例</summary>

開始タグと終了タグの間に書きます。`input` は `value` 属性に書くので、そこが違います。

</details>

<details>
<summary>問3の解答例</summary>

選択肢の名前だけでなく、何を聞かれているのか(質問文)が読み上げでも伝わるようになります。

</details>

<details>
<summary>問4の解答例</summary>

`type="button"` です。`type` を省くと `submit` 扱いになり、押した瞬間にフォームが送信されてしまうからです。

</details>

## 確認クイズ

### Q1. 決まった候補から 1 つ選ばせ、候補が 10 個以上ある入力に向いているのはどれですか。

- A. `select`
- B. `textarea`
- C. `type="checkbox"` の `input`

<details>
<summary>答え</summary>

**A** — 畳まれているので、選択肢が多くても場所を取りません。

</details>

### Q2. `textarea` の初期値の書き方として正しいものはどれですか。

- A. `value` 属性に書く
- B. 開始タグと終了タグの間に書く
- C. `placeholder` 属性に書く

<details>
<summary>答え</summary>

**B** — `input` と違う点なので間違えやすいところです。タグの間の改行や空白もそのまま初期値になります。

</details>

### Q3. ラジオボタンで 1 つだけしか選べないようにするために必要なものはどれですか。

- A. すべて同じ `id` にする
- B. すべて同じ `name` にする
- C. すべて同じ `value` にする

<details>
<summary>答え</summary>

**B** — `name` が同じもの同士でグループになります。両方選べてしまうときは `name` を疑います。

</details>

### Q4. `legend` はどこに書きますか。

- A. `fieldset` の最初の子として書く
- B. `fieldset` の直前に書く
- C. `form` の最後に書く

<details>
<summary>答え</summary>

**A** — そのまとまりの見出しになり、質問文として読み上げられます。

</details>

### Q5. `form` の中の `button` で `type` を省くとどうなりますか。

- A. 何も起きないボタンになる
- B. 送信ボタンとして扱われる
- C. 入力内容がリセットされる

<details>
<summary>答え</summary>

**B** — 既定は `submit` です。送信しないボタンには必ず `type="button"` を書きます。

</details>
