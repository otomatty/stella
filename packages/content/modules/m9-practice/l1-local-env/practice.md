# レッスン9-1 演習 — ローカル環境

対象トピック: 9-1-1 〜 9-1-3

**このレッスンから、Playgroundではなく自分のPCで作業します。**

## ハンズオン

### 1. Node.jsとVS Codeを入れる

- [Node.js公式サイト](https://nodejs.org/ja) からLTS版をインストール
- [VS Code公式サイト](https://code.visualstudio.com/) からインストール

ターミナルで確認します。

```bash
node -v
```

```bash
npm -v
```

### 2. プロジェクトを作る

作業用のフォルダを作り、VS Codeで開いてから、ターミナルで次を実行します。

```bash
npm init -y
```

```bash
npm install --save-dev typescript
```

### 3. コードを書いて動かす

`index.ts` というファイルを作り、次を書きます。

```ts
const greet = (name: string): string => `${name}さん、こんにちは`;

console.log(greet("田中"));
```

```bash
npx tsc index.ts
```

```bash
node index.js
```

「田中さん、こんにちは」と表示されれば成功です。

## 演習問題

### 問1(基本)

生成された`index.js`を開いて、`index.ts`と見比べてください。**消えているもの**は何ですか。

### 問2(基本)

`index.ts`の`greet("田中")`を`greet(28)`に書き換えてから`npx tsc index.ts`を実行してください。何が起きるか確認し、VS Code上でも同じ指摘が出ることを確認してください。

### 問3(応用)

`npm init -y`で作られた`package.json`を開いてください。`typescript`はどこに書かれていますか。また、なぜそこに書かれているのかを説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

**型注釈**(`: string`)が消えています。

```ts
// index.ts
const greet = (name: string): string => `${name}さん、こんにちは`;
```

```js
// index.js
const greet = (name) => `${name}さん、こんにちは`;
```

レッスン0-1で学んだとおり、型はコンパイラーへの指示であり、変換後のJavaScriptには残りません。Playgroundの「.JS」タブで見ていたものが、手元のファイルとして生成されています。

</details>

<details>
<summary>問2の解答例</summary>

次のエラーが出て、`index.js`は更新されません。

```
error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

VS Code上でも、`28`の部分に赤い波線が出て同じメッセージが表示されます。**ターミナルで実行する前に、書いている最中に分かる**という点が重要です。

なお、既定では型エラーがあっても`.js`自体は出力されることがあります。出力を止めたい場合は`noEmitOnError`という設定を使いますが、詳細はレッスン9-3の範囲です。

</details>

<details>
<summary>問3の解答例</summary>

`devDependencies`に書かれています。

```json
{
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

`--save-dev`を付けてインストールしたためです。TypeScriptは**変換するときだけ必要**で、変換後のJavaScriptを動かす本番環境では不要だからです。

本番でも必要なもの(通信ライブラリーなど)は`dependencies`に入ります。この違いはレッスン9-2で扱います。

</details>

## 確認クイズ

### Q1. Node.jsは何をするものですか?

- A. TypeScriptを書くためのエディター
- B. ブラウザの外でJavaScriptを動かす実行環境
- C. 型をチェックする道具

<details>
<summary>答え</summary>

**B** — TypeScriptのコンパイラー自体も、Node.jsの上で動いています。

</details>

### Q2. `npx tsc index.ts` を実行すると何が起きますか?

- A. `index.ts`が実行される
- B. `index.js`が生成される
- C. 型チェックだけ行われる

<details>
<summary>答え</summary>

**B** — 変換されたJavaScriptのファイルができます。実行するにはさらに`node index.js`が必要です。

</details>

### Q3. `npm`は別途インストールが必要ですか?

- A. 必要
- B. 不要。Node.jsに同梱されている

<details>
<summary>答え</summary>

**B** — `node -v`と`npm -v`の両方が表示されれば準備完了です。

</details>
