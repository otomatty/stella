# レッスン0-1 演習 — Node.jsとは何か

対象トピック: 0-1-1 〜 0-1-4

## 手元で試す

まず、自分の環境にNode.jsが入っているかを確かめます。

```bash
node -v      # => v22.14.0 のように表示される
npm -v       # => 10.9.2 のように表示される
which node   # 実体の場所を確かめる(コマンドライン入門 5-1-4)
```

`command not found` と表示された場合は、[Node.js 公式サイト](https://nodejs.org/ja)からLTS版をインストールしてください。

入っていることを確認できたら、ブラウザとの違いを目で見ます。

```bash
node -e "console.log('動きました')"
node -e "console.log(document)"
# => ReferenceError: document is not defined
```

2行目のエラーが、DOMが存在しないことの証拠です。エラーメッセージをそのまま読んでみてください。

最後に、この講座で使う3つの書き方を確かめます。

```bash
node -e "const port = 3000; console.log(port);"
node -e "function greet(n) { return 'hello ' + n; } console.log(greet('佐藤'));"
node -e "const user = { id: 1, name: '佐藤' }; console.log(user.name);"
```

## 演習問題

### 問1(基本)

Node.jsとは何かを1文で説明してください。「言語」という言葉を使わずに書いてください。

### 問2(基本)

自分の環境のNode.jsの版を確認するコマンドを書いてください。

### 問3(応用)

ブラウザ向けのサンプルコードをNode.jsで実行したら `document is not defined` と表示されました。原因を説明してください。

### 問4(応用)

チームで「Node.jsはLTSの版にそろえる」と決める理由を1つ挙げてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

ブラウザの外でJavaScriptを動かすための実行環境です。

Node.js自体は言語ではなく、JavaScriptというプログラムを動かす土台です。だから、言語の書き方はブラウザ向けと同じままです。

</details>

<details>
<summary>問2の解答例</summary>

```bash
node -v
```

`v22.14.0` のように表示されます。あわせて `npm -v` でnpmの版も確認できます。

</details>

<details>
<summary>問3の解答例</summary>

`document` はブラウザが持つDOM(画面を操作するしくみ)の一部で、Node.jsには存在しないためです。

Node.jsには画面がありません。その代わりにファイルやネットワークを扱えます。扱えるものが違う、というのがブラウザとの本質的な差です。

</details>

<details>
<summary>問4の解答例</summary>

全員が同じ土台の版を使うことで、「自分の環境では動く」というすれ違いを減らせるためです。

LTSは長期間サポートされる安定版なので、業務ではサポート期間の長さと安定性を優先します。

</details>

## 確認クイズ

### Q1. Node.jsの説明として正しいものはどれですか。

- A. JavaScriptに代わる新しいプログラミング言語
- B. ブラウザの外でJavaScriptを動かすための実行環境
- C. ブラウザの一種

<details>
<summary>答え</summary>

**B** — Node.jsは言語ではなく実行環境です。動かす言語はJavaScriptのままです。

</details>

### Q2. Node.jsにあってブラウザに無いものはどれですか。

- A. DOM(画面を操作するしくみ)
- B. ファイルを自由に読み書きする機能
- C. JavaScriptを実行する機能

<details>
<summary>答え</summary>

**B** — Node.jsはファイルシステムを直接扱えます。DOMはブラウザ側にあり、Node.jsにはありません。

</details>

### Q3. Node.jsで `document` を使うとどうなりますか。

- A. 画面が表示される
- B. `ReferenceError: document is not defined` になる
- C. 空のオブジェクトが返る

<details>
<summary>答え</summary>

**B** — `document` はブラウザのDOMの一部なので、Node.jsには存在しません。

</details>

### Q4. `node -v` を実行する目的はどれですか。

- A. Node.jsの版を確認する
- B. Node.jsを更新する
- C. JavaScriptファイルを実行する

<details>
<summary>答え</summary>

**A** — `-v` は version の確認です。環境の差を切り分けるとき、最初に見る情報です。

</details>

### Q5. 業務でLTS版を選ぶ理由として最も適切なものはどれですか。

- A. 最新の機能をいち早く使えるから
- B. 長期間サポートされ、安定して使えるから
- C. 動作が最も速いから

<details>
<summary>答え</summary>

**B** — LTS(long term support)は長期サポートの安定版です。業務では新機能より安定性とサポート期間を優先します。

</details>
