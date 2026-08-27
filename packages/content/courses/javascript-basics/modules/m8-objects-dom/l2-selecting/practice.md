# レッスン8-2 演習 — 要素を取る

対象トピック: 8-2-1 〜 8-2-3

## 手元で試す

テキストエディタとブラウザーだけで進められます。スマートフォンで受講している場合は、この節は飛ばして「演習問題」から進めてください。

1. `select.html` を作り、次を書いて保存する

```html
<body>
  <h1>今日のタスク</h1>
  <ul>
    <li class="task">見積作成</li>
    <li class="task">レビュー</li>
    <li class="task">報告書</li>
  </ul>
  <script>
    console.log(document.querySelector("h1"));
    console.log(document.querySelectorAll(".task").length);
  </script>
</body>
```

2. h1要素と `3` が表示されることを確かめる

書けたら、次の改造を試してみましょう。

1. liを1つ増やして保存し、コードを変えずに個数が `4` になることを確かめる
2. `document.querySelector(".task")` (Allなし)だと最初の1つだけが取れることを確かめる
3. `for (const item of document.querySelectorAll(".task"))` で全項目をコンソールに並べる
4. 開発者ツールの「要素」(Elements)タブでDOMツリーを開き、ulの中にliが並ぶ木の形を目で確かめる

## 演習問題

### 問1(基本)

「HTMLファイル」と「DOM」の関係を、JavaScriptが書き換えるのはどちらかを含めて1〜2文で説明してください。

### 問2(基本)

次の要素を取るquerySelector / querySelectorAllの呼び出しをそれぞれ書いてください。

1. class属性が `menu` の要素を1つ
2. id属性が `header` の要素
3. class属性が `item` の要素すべて

### 問3(応用)

`querySelectorAll(".item")` で取った集まりに対して、そのまま `items.map(...)` を呼ぶとエラーになります。理由と、全件に処理をする代わりの書き方を1つ答えてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

ブラウザーはHTMLファイルを読み込んで、DOMという木の形のデータ構造を組み立てます。JavaScriptが書き換えるのはDOMの方で、HTMLファイル自体は変わりません(再読み込みで元に戻ります)。

</details>

<details>
<summary>問2の解答例</summary>

```js
document.querySelector(".menu");
document.querySelector("#header");
document.querySelectorAll(".item");
```

classは `.`、idは `#` を付けます。CSSと同じ記法です。

</details>

<details>
<summary>問3の解答例</summary>

querySelectorAllが返すのはNodeListで、配列ではないためmapを持ちません。for...ofで回すか、`Array.from(items)` で配列に変換してからmapを使います。

</details>

## 確認クイズ

### Q1. DOMの説明として正しいものはどれですか。

- A. ブラウザーがHTMLから組み立てる、操作できる木の形のデータ構造
- B. HTMLファイルの別名
- C. CSSの設定ファイル

<details>
<summary>答え</summary>

**A** — JavaScriptが書き換えるのはこのDOMで、画面はDOMの状態の描画です。

</details>

### Q2. JavaScriptでDOMを書き換えたとき、HTMLファイルはどうなりますか。

- A. 自動で上書き保存される
- B. 変わらない
- C. 削除される

<details>
<summary>答え</summary>

**B** — 書き換わるのはメモリ上のDOMだけです。再読み込みすると元に戻ります。

</details>

### Q3. class属性が "save" の要素を1つ取る書き方はどれですか。

- A. document.querySelector("save")
- B. document.querySelector(".save")
- C. document.querySelector("#save")

<details>
<summary>答え</summary>

**B** — classは `.`、idは `#` です。CSSのセレクターと同じ記法が使えます。

</details>

### Q4. querySelectorAllの戻り値の説明として正しいものはどれですか。

- A. 最初に見つかった要素1つ
- B. 当てはまる要素すべての集まり(NodeList)で、for...ofで回せる
- C. 要素の個数(数値)

<details>
<summary>答え</summary>

**B** — 全部ほしいときはAll付きです。lengthで個数も確認できます。

</details>
