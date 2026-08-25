# レッスン3-2 演習 — フォーム部品の見た目

対象トピック: 3-2-1 〜 3-2-4

## 手元で試す

前のレッスンで作ったフォームの各組を `.field` で包みます。

```html
<form action="/apply" method="post">
  <div class="field">
    <label for="dept">部署</label>
    <select id="dept" name="dept">
      <option value="dev">開発</option>
      <option value="sales">営業</option>
    </select>
  </div>

  <div class="field">
    <label for="body">備考</label>
    <textarea id="body" name="body" rows="5"></textarea>
  </div>

  <button type="submit" disabled>申し込む</button>
</form>
```

`style.css` に次を足します。トークン(`--line` / `--radius-1` / `--space-2` など)はレッスン1-1 で `:root` に定義したものです。まだなら先に足してください。

```css
input,
select,
textarea,
button {
  font: inherit;
  color: inherit;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  :is(input, select, textarea) {
    box-sizing: border-box;
    border: 1px solid var(--line);
    border-radius: var(--radius-1);
    padding: var(--space-2);
    background-color: var(--surface);
    inline-size: 100%;

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

入力欄の書体が本文とそろい、Tab で進むと枠が出れば成功です。書けたら、次の改造をしてみましょう。

1. `font: inherit` を消して、入力欄だけ書体が変わることを確かめる(確かめたら戻す)
2. `box-sizing: border-box` を消して、`padding` と枠のぶん入力欄が `.field` からはみ出すことを確かめる(確かめたら戻す)
3. `form` の `gap` と `.field` の `gap` を同じ値にして、まとまりが見えにくくなることを確かめる
4. ラジオボタンを 2 つ足し、`input:checked + label` でラベルの文字が変わるようにする

## 演習問題

### 問1(基本)

`form` の `gap` を広め、`.field` の `gap` を狭めにするのはなぜですか。

### 問2(基本)

入力欄の中の文字だけ書体が違うとき、書くべき 1 行はどれですか。

### 問3(基本)

`inline-size: 100%` を当てた入力欄が `.field` からはみ出しました。足りない 1 行を書いてください。

### 問4(応用)

`input:focus { outline: none; }` とだけ書いた CSS の問題点を、1 文で答えてください。

### 問5(応用)

条件が揃うまで押せないボタンを、`display: none` で隠すのではなく `:disabled` で薄く残すのはなぜですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

間隔に差を付けると、ラベルと入力欄が 1 つの組だと目で分かるからです。近いものほど関係が強く見えます。

</details>

<details>
<summary>問2の解答例</summary>

```css
font: inherit;
```

`input` / `select` / `textarea` / `button` に当てます。

</details>

<details>
<summary>問3の解答例</summary>

```css
box-sizing: border-box;
```

既定の `content-box` では中身の領域だけが 100% になり、`padding` と枠の太さが足されてはみ出します。

</details>

<details>
<summary>問4の解答例</summary>

フォーカスの手がかりを消したまま代わりを用意していないので、いまどの欄を入力しているのか分からなくなります。

</details>

<details>
<summary>問5の解答例</summary>

隠してしまうと、条件が揃えば押せるボタンがあること自体が分からなくなるからです。

</details>

## 確認クイズ

### Q1. フォームのレイアウトとして推奨される形はどれですか。

- A. ラベルと入力欄を 1 組にまとめ、組を縦に積む
- B. すべての要素を 1 行に横並びにする
- C. 入力欄だけを先にまとめ、ラベルは最後に並べる

<details>
<summary>答え</summary>

**A** — 上から順に埋める形がいちばん迷いません。

</details>

### Q2. `font: inherit` を入力欄に当てる目的はどれですか。

- A. 入力欄の幅を親に合わせるため
- B. 親の書体・大きさをそのまま受け継ぐため
- C. 入力できる文字数を制限するため

<details>
<summary>答え</summary>

**B** — フォーム部品は書体を継承しないので、明示して受け継ぎます。

</details>

### Q3. `inline-size: 100%` の入力欄が親からはみ出すのはなぜですか。

- A. 既定の `content-box` では中身の領域だけが 100% になり、`padding` と枠が足されるから
- B. `inline-size` は入力欄には効かないから
- C. 親に `overflow: hidden` が無いから

<details>
<summary>答え</summary>

**A** — `box-sizing: border-box` を当てると、`padding` と枠を含めて 100% になります。

</details>

### Q4. `:is(input, select, textarea)` はどういう意味ですか。

- A. 3 つすべてを同時に含む要素
- B. かっこの中のどれかに当たる要素
- C. 3 つの要素が並んでいる場所

<details>
<summary>答え</summary>

**B** — セレクタを並べて書くより短く済みます。

</details>

### Q5. フォーカスの枠を消してよいのはどんなときですか。

- A. 見た目に合わないと感じたとき
- B. 代わりの手がかりを `:focus-visible` で用意したとき
- C. マウスで操作する利用者しかいないとき

<details>
<summary>答え</summary>

**B** — 消す・出し直すはセットです。長いフォームほど現在位置の表示が効きます。

</details>
