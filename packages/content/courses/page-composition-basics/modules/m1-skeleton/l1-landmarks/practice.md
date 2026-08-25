# レッスン1-1 演習 — 骨格を置く

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

この講座では、1 枚の `index.html` / `style.css` を最後まで育てていきます。新しいフォルダに 2 つのファイルを作り、まず骨格だけを置きます。

`index.html`:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>勉強会一覧 | 社内勉強会ポータル</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header>
      <p>社内勉強会ポータル</p>
    </header>
    <main>
      <h1>勉強会一覧</h1>
      <p>毎週の勉強会の予定と申し込みをまとめたページです。</p>
    </main>
    <footer>
      <p><small>© 2026 社内勉強会運営チーム</small></p>
    </footer>
  </body>
</html>
```

`style.css` の先頭に、このページのトークンを 1 セットだけ書きます。

```css
:root {
  --surface: oklch(99% 0 0);
  --surface-2: oklch(96% 0 0);
  --ink: oklch(25% 0 0);
  --muted: oklch(45% 0 0);
  --faint: oklch(65% 0 0);
  --line: oklch(88% 0 0);
  --accent: oklch(55% 0.16 264);
  --space-2: 8px;
  --space-3: 16px;
  --space-5: 48px;
  --radius-1: 8px;
}

body {
  margin: 0;
  background-color: var(--surface);
  color: var(--ink);
}
```

ブラウザーで開いて、上・本文・下の 3 つの内容が縦に並べば成功です。書けたら、次の改造をしてみましょう。

1. 開発者ツールで `header` / `main` / `footer` の 3 要素が `body` の直下に並んでいることを確かめる
2. `--ink` の値だけを `oklch(35% 0.05 264)` に変えて、文字色がページ全体で一度に変わることを確かめる
3. `main` の外(`header` との間)に `<p>テスト</p>` を置いてみて、「どの landmark にも属さない内容」がどういう状態かを確かめる(確かめたら消す)

## 演習問題

### 問1(基本)

`header` / `nav` / `main` / `footer` のような要素を landmark と呼ぶのは、誰(何)のための目印だからですか。1 文で答えてください。

### 問2(基本)

「本文の話題が 2 つあるので `main` を 2 つ書く」が良くない理由を 1 文で答えてください。

### 問3(応用)

「臨時休業のお知らせ」の 1 行を `header` と `main` の間に直置きしてある HTML を、原則に合う形に直すとしたら、どこへ動かしますか。候補を 1 つ挙げ、理由を添えてください。

### 問4(応用)

練習で作った 2 つの部品の CSS を持ち寄ったら、`:root` の定義が 2 か所になりました。そのままにすると何が起きますか。1 文で答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

読み上げソフトなどの機械のための目印で、利用者が landmark の一覧からページ内の領域へ一足飛びに移動できます。

</details>

<details>
<summary>問2の解答例</summary>

HTML では文書に置ける `main` は 1 つ(`hidden` で隠したものを除く)と決まっており、2 つ並ぶと landmark の一覧に「メイン」が重複して、利用者がどちらが本文か判別できなくなるからです。話題の区切りは `main` の中で付けます。

</details>

<details>
<summary>問3の解答例</summary>

ページ全体に関わるお知らせなら `header` の中、本文の一部なら `main` の中へ動かします。直置きのままだと landmark の一覧から漏れ、landmark 単位で移動する人に見つけてもらいにくい内容になるためです。

</details>

<details>
<summary>問4の解答例</summary>

後から読まれた `:root` が同じ名前のトークンを上書きし、部品の CSS を見ても原因の分からない色や余白のずれが起きます。定義は先頭の 1 セットに集めます。

</details>

## 確認クイズ

### Q1. この講座で扱う内容はどれですか。

- A. 新しい UI 部品の作り方
- B. 作った部品を 1 枚のページに組み立てる方法
- C. JavaScript での画面の動かし方

<details>
<summary>答え</summary>

**B** — 部品の作り方は前の講座までで終わっています。この講座の主役は骨格と配置です。

</details>

### Q2. 1 枚のページの骨格として正しい組み合わせはどれですか。

- A. `header`・`nav`・`main`・`footer`
- B. `div`・`span`・`p`・`a`
- C. `table`・`tr`・`td`・`th`

<details>
<summary>答え</summary>

**A** — この 4 つが landmark になる要素で、読み上げソフトの移動先の地図になります。`div` で同じ見た目は作れますが、地図には載りません。

</details>

### Q3. `main` の置き方として正しいのはどれですか。

- A. 話題の数だけ置いてよい
- B. ページに 1 つだけ置く
- C. 置かなくてもよい要素なので省略する

<details>
<summary>答え</summary>

**B** — 文書に置ける `main` は 1 つ、という HTML の決まりです。話題の区切りは `main` の中で付けます。

</details>

### Q4. 目に見える内容の置き場所の原則はどれですか。

- A. 必ずどれかの landmark の中に置く
- B. 目立たせたい内容は `body` の直下に置く
- C. `header` より上に置く

<details>
<summary>答え</summary>

**A** — landmark の外に直置きした内容は一覧から漏れ、landmark 単位で移動する人に見つけてもらいにくくなります(頭から順に読まないと出会えません)。

</details>

### Q5. ページのトークンの置き方として正しいのはどれですか。

- A. 部品ごとに `:root` を書いて持ち寄る
- B. `:root` の 1 セットに集め、部品側は `var()` で参照する
- C. トークンは使わず、部品ごとに生の値を書く

<details>
<summary>答え</summary>

**B** — `:root` が 2 セットあると後の定義が前を上書きし、原因の探しにくい見た目のずれが起きます。定義は 1 か所、部品側は参照だけです。

</details>
