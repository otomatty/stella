# レッスン2-2 演習 — 入力を受け取る

対象トピック: 2-2-1 〜 2-2-3

## 手元で試す

`index.html` の body に、次の申し込み欄を足して保存し、ブラウザーで開いてください。

```html
<h2>申し込み</h2>
<label for="name">お名前</label>
<input type="text" id="name" />
<label for="mail">メールアドレス</label>
<input type="email" id="mail" />
<button type="submit">送信する</button>
```

表示できたら、次の改造をしてみましょう。

1. 「お名前」の文字を押して、名前の欄にカーソルが入ることを確かめる
2. `id="mail"` を `id="email"` に変えて、ラベルを押しても反応しなくなることを確かめる(確かめたら戻す)
3. `type="email"` を `type="date"` に変えて、欄の見た目が変わることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

「電話番号」というラベルの付いた、1行の文字を入力する欄を書いてください。for と id には `tel` を使ってください。

### 問2(基本)

次のHTMLは、ラベルを押しても入力欄にカーソルが入りません。理由を説明して、直してください。

```html
<label for="company">会社名</label>
<input type="text" id="companyName" />
```

### 問3(応用)

「利用規約に同意する」というチェックボックスを、ラベル付きで書いてください。

### 問4(応用)

「一覧に戻る」という操作を作るとき、リンクとボタンのどちらを使いますか。理由も1文で書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```html
<label for="tel">電話番号</label>
<input type="text" id="tel" />
```

`for` と `id` を同じ値にするのが結び付けの条件です。

</details>

<details>
<summary>問2の解答例</summary>

`for` の値と `id` の値が違うためです。どちらかに合わせます。

```html
<label for="company">会社名</label>
<input type="text" id="company" />
```

見た目は変わらないので、ラベルを押して確かめるのが確実です。

</details>

<details>
<summary>問3の解答例</summary>

```html
<label for="agree">利用規約に同意する</label>
<input type="checkbox" id="agree" />
```

チェックボックスは `type="checkbox"` です。ラベルを結び付けると、文字の部分を押してもチェックできます。

</details>

<details>
<summary>問4の解答例</summary>

リンクを使います。別のページへ移動する操作だからです。

</details>

## 確認クイズ

### Q1. 入力欄の種類を決める属性はどれですか。

- A. type
- B. id
- C. src

<details>
<summary>答え</summary>

**A** — `type` で1行の文字、メールアドレス、日付、チェックボックスなどに変わります。

</details>

### Q2. label と input を結び付ける条件はどれですか。

- A. label と input を続けて書くこと
- B. label の for と input の id を同じ値にすること
- C. label で input を囲んだうえで src を書くこと

<details>
<summary>答え</summary>

**B** — 値が一致したときだけ結び付きます。並べて書いただけでは結び付きません。

</details>

### Q3. label を結び付けると得られる効果はどれですか。

- A. 入力欄の文字が自動で大きくなる
- B. ラベルを押すとその欄にカーソルが入る
- C. 入力が必須になる

<details>
<summary>答え</summary>

**B** — 押せる範囲が広がります。読み上げソフトが欄の説明を読めるようになるのも効果です。

</details>

### Q4. 別のページへ移動させたいときに使うのはどれですか。

- A. リンク
- B. ボタン
- C. 入力欄

<details>
<summary>答え</summary>

**A** — 移動はリンク、その場の操作はボタンです。役割で選びます。

</details>

### Q5. div に枠を付けて「送信する」と書いた部品の問題点はどれですか。

- A. 文字が小さく表示される
- B. キーボードで操作する人が押せない
- C. 画面の右端にしか置けない

<details>
<summary>答え</summary>

**B** — 見た目は似せられますが、押せる部品にはなりません。押せる部品には button を使います。

</details>
