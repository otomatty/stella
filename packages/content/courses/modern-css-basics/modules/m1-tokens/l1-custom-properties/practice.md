# レッスン1-1 演習 — カスタムプロパティ

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

HTML/CSS 入門で作った `index.html` と `style.css` を使います。手元に無い場合は、次の2ファイルを新しく作ってください。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>カスタムプロパティの練習</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h2>研修のお知らせ</h2>
    <div class="notice"><h2>締め切りは金曜です</h2></div>
    <button>申し込む</button>
  </body>
</html>
```

`style.css` に次を書いて保存し、ブラウザーで開いてください。

```css
:root {
  --accent: navy;
}

h2 {
  color: var(--accent);
}

button {
  border: 2px solid var(--accent);
}
```

見出しの文字とボタンの枠が同じ色になれば成功です。書けたら、次の改造をしてみましょう。

1. `:root` の `--accent` を `seagreen` に変えて、2か所が一度に変わることを確かめる
2. `.notice { --accent: crimson; }` を足して、お知らせの中の見出しだけ変わることを確かめる
3. `var(--accent)` をわざと `var(--acent, gray)` と打ち間違えて、予備の値が使われることを確かめる(確かめたら戻す)

## 演習問題

### 問1(基本)

`--space` という名前で `16px` を覚えさせる宣言を書いてください。

### 問2(基本)

問1の値を `padding` で取り出して使う宣言を書いてください。

### 問3(応用)

ページ全体で使う色を定義したいとき、どのセレクタの中に書くのが既定ですか。理由とあわせて1文で答えてください。

### 問4(応用)

`:root` で `--accent: navy` を定義したまま、`.card` の中だけ `orange` にしたいです。足すルールを書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```css
--space: 16px;
```

`--` で始まる名前に、普通の宣言と同じ形で値を書きます。

</details>

<details>
<summary>問2の解答例</summary>

```css
padding: var(--space);
```

取り出すときは `var()` に名前を渡します。

</details>

<details>
<summary>問3の解答例</summary>

`:root` です。カスタムプロパティは子に継承されるので、根っこに置けばページのどこからでも取り出せます。

</details>

<details>
<summary>問4の解答例</summary>

```css
.card {
  --accent: orange;
}
```

同じ名前を定義し直すと、その要素の中だけ値が上書きされます。

</details>

## 確認クイズ

### Q1. カスタムプロパティの名前として正しいのはどれですか。

- A. $brand-color
- B. --brand-color
- C. @brand-color

<details>
<summary>答え</summary>

**B** — カスタムプロパティの名前は `--` で始めます。`--` の後ろは自分で決められます。

</details>

### Q2. `--brand-color: navy;` を書いただけのとき、画面はどうなりますか。

- A. 何も変わらない
- B. 文字が navy になる
- C. エラーで表示が崩れる

<details>
<summary>答え</summary>

**A** — カスタムプロパティは値を覚えるだけで、見た目は変えません。`var()` で取り出して初めて効きます。

</details>

### Q3. 覚えさせた値を取り出す書き方はどれですか。

- A. get(--brand-color)
- B. use(--brand-color)
- C. var(--brand-color)

<details>
<summary>答え</summary>

**C** — `var()` にカスタムプロパティの名前を渡して取り出します。

</details>

### Q4. カスタムプロパティを `:root` に置くとページ全体で使えるのはなぜですか。

- A. :root の宣言は詳細度が最も高いから
- B. カスタムプロパティが子に継承されるから
- C. ブラウザーが :root だけ特別に扱うから

<details>
<summary>答え</summary>

**B** — 継承の仕組みです。すべての要素は `html` の子孫なので、根っこの定義がどこでも受け継がれます。

</details>

### Q5. `.notice { --accent: crimson; }` で上書きしたとき、影響が及ぶ範囲はどこですか。

- A. ページ全体
- B. .notice とその中だけ
- C. .notice より前に書いたルールだけ

<details>
<summary>答え</summary>

**B** — 定義し直した要素とその中だけが新しい値になります。外側の `:root` の定義は変わりません。

</details>
