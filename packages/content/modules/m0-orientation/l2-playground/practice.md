# レッスン0-2 演習 — Playgroundを使う

対象トピック: 0-2-1 〜 0-2-3

## ハンズオン

[TypeScript Playground](https://www.typescriptlang.org/ja/play) を開いて、既に書かれているコードをすべて消し、次のコードを写経してください。

```ts
console.log("研修を始めます");
console.log(480 * 3);
```

写経できたら、次の改造をしてみましょう。

1. 「Run」を押して、下に結果が2行出ることを確認しましょう
2. 右側の「.JS」タブを開いて、変換後のJavaScriptを見てみましょう
3. 2行目を `console.log(480 * 3` に書き換え(閉じかっこを消し)、赤い波線にカーソルを乗せてメッセージを読みましょう
4. 書き換えたあとのURLをコピーして、別のタブで開いてみましょう

## 演習問題

### 問1(基本)

次の3つを`console.log`で表示するコードを書いてください。

- 文字列「注文を受け付けました」
- `1200 + 300` の計算結果
- 文字列「ありがとうございました」

### 問2(基本)

次のコードを実行すると、何も表示されずエラーになります。エラーメッセージを読んで、原因を説明し、直してください。

```ts
console.log("こんにちは);
```

### 問3(応用)

次のコードをPlaygroundに貼り付けて、右側の「.JS」タブを確認してください。**変換後のJavaScriptから消えているもの**は何ですか。なぜ消えるのかも説明してください。

```ts
const shopName: string = "青山コーヒー店";
const price: number = 480;
console.log(shopName);
console.log(price);
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```ts
console.log("注文を受け付けました");
console.log(1200 + 300);
console.log("ありがとうございました");
// => "注文を受け付けました"
// => 1500
// => "ありがとうございました"
```

`console.log`は書いた順に実行されます。文字列は引用符で囲み、計算式はそのまま書けます。

</details>

<details>
<summary>問2の解答例</summary>

```ts
console.log("こんにちは");
```

引用符が閉じていないことが原因です。「Unterminated string literal.(文字列が終わっていません)」というエラーが出ます。

引用符やかっこは必ず対で書きます。表示されないときの確認手順の2番目に挙げたのが、まさにこのパターンです。

</details>

<details>
<summary>問3の解答例</summary>

**型注釈(`: string` と `: number`)** が消えています。

```js
const shopName = "青山コーヒー店";
const price = 480;
console.log(shopName);
console.log(price);
```

型はコンパイラーに「この変数には何が入るか」を伝えるための情報です。チェックが終われば役目は終わりなので、変換後のJavaScriptには残りません。

だからこそ、型は実行中のデータを守ってはくれません。開発中に間違いを見つけるための道具です。

</details>

## 確認クイズ

### Q1. TypeScript Playgroundを使うために必要なものはどれですか?

- A. ブラウザ
- B. Node.jsのインストール
- C. VS Codeのインストール

<details>
<summary>答え</summary>

**A** — ブラウザだけで動きます。Node.jsとVS CodeはModule 9で扱います。

</details>

### Q2. `console.log(300 + 50);` を実行すると何が表示されますか?

- A. `300 + 50`
- B. `350`
- C. `"35050"`

<details>
<summary>答え</summary>

**B** — かっこの中はまず計算され、その結果が表示されます。

</details>

### Q3. Playgroundの「.JS」タブで見られるものはどれですか?

- A. エラーの一覧
- B. 変換後のJavaScript
- C. 実行結果

<details>
<summary>答え</summary>

**B** — TypeScriptがJavaScriptに変換された結果が表示されます。型注釈が消えていることを確認できます。

</details>

### Q4. 赤い波線が出たとき、最初にすべきことはどれですか?

- A. コードをすべて消して書き直す
- B. カーソルを乗せてメッセージを読む
- C. とりあえず実行してみる

<details>
<summary>答え</summary>

**B** — メッセージに原因が書いてあります。エラーは失敗ではなく、早い段階で気づけたという合図です。

</details>
