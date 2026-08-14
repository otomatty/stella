# レッスン9-1 演習 — ローカル環境

対象トピック: 9-1-1 〜 9-1-5

**このレッスンから、Playgroundではなく自分のPC(Windows)で作業します。**  
講師がいなくても、下のチェックを上から順に進めれば完了できます。

## ハンズオン

### 1. ターミナルを開けるようにする

1. Windowsの「スタート」を開く
2. `cmd` と入力し、**コマンドプロンプト** を起動する
3. 黒い画面が出れば成功

以後、コマンドはこの画面に貼り付けて Enter を押します。  
(PowerShellでも作業できますが、本研修ではまずコマンドプロンプトを使います)

### 2. Node.js(LTS)を入れる

1. [Node.js公式サイト](https://nodejs.org/ja) をブラウザで開く
2. **LTS** と書いてある側のボタンからインストーラーをダウンロードする
3. ダウンロードした `.msi` を実行する
4. 画面の指示どおり「次へ」で進める(特別な変更は不要)
5. 完了したら、開いていたコマンドプロンプトを**閉じて**、もう一度開き直す

確認します。

```bash
node -v
```

```bash
npm -v
```

両方とも `v...` や `10....` のような数字が出れば成功です。数字の違いは気にしなくて構いません。

**うまくいかないとき**

- `認識されていません` / `command not found` → ターミナルを閉じてもう一度開く。それでも駄目ならPCを再起動する
- `running scripts is disabled` / `npm.ps1 cannot be loaded` → PowerShellの実行ポリシーが原因です。**コマンドプロンプト**でやり直すか、VS Codeのターミナル右上「+」の横から **Command Prompt** を選ぶ
- サイトに LTS と Current がある → **必ず LTS** を選ぶ

### 3. VS Codeを入れる

1. [VS Code公式サイト](https://code.visualstudio.com/) からWindows用を入れる
2. デスクトップなどに作業用フォルダを作る(例: `Documents\ts-practice`)
3. VS Codeを起動し、「フォルダーを開く」でそのフォルダを選ぶ
4. メニュー「ターミナル」→「新しいターミナル」を開く
5. 既定がPowerShellのときは、ターミナル右上の「+」の横から **Command Prompt** を選ぶ

ここから先の `npm` / `npx` は、この Command Prompt で実行します。

### 4. TypeScriptをプロジェクトに入れる

手順3で開いた **Command Prompt** で、次を順に実行します。
```bash
npm init -y
```

```bash
npm install --save-dev typescript
```

エラーなく終われば成功です。フォルダ内に設定用のファイルや `node_modules` が増えていて構いません。

### 5. 書いて、変換して、動かす

VS Codeで `index.ts` というファイルを新規作成し、次を書きます。

```ts
const greet = (name: string): string => `${name}さん、こんにちは`;

console.log(greet("田中"));
```

保存したあと、ターミナルで次を実行します。

```bash
npx tsc index.ts
```

```bash
node index.js
```

「田中さん、こんにちは」と表示されれば、このレッスンのハンズオンは完了です。

**うまくいかないとき**

- `npx` や `tsc` が見つからない → 手順4を、`index.ts` があるフォルダでやり直す
- `running scripts is disabled` / `npx.ps1 cannot be loaded` → VS CodeのターミナルがPowerShellのときです。右上「+」の横から **Command Prompt** を選んでやり直す
- 赤い波線が見えない → ファイルの拡張子が `.ts` か確認する。フォルダごと開けているかも確認する

## 演習問題

### 問1(基本)

生成された`index.js`を開いて、`index.ts`と見比べてください。**消えているもの**は何ですか。

### 問2(基本)

`index.ts`の`greet("田中")`を`greet(28)`に書き換えてから`npx tsc index.ts`を実行してください。何が起きるか確認し、VS Code上でも同じ指摘が出ることを確認してください。

### 問3(応用)

`npm init -y`のあとにできた設定用のファイルを開き、`typescript`がどの欄に書かれているかを探してください。また、なぜ `--save-dev` で入れたのかを、自分の言葉で説明してください。

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

次のエラーが出ます。

```
error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

既定では、型エラーがあっても`index.js`は**更新されます**。エラーが出たことと、`.js`ができたことは別です。出力を止めたい場合は`noEmitOnError`という設定を使いますが、詳細はレッスン9-3の範囲です。

VS Code上でも、`28`の部分に赤い波線が出て同じメッセージが表示されます。**ターミナルで実行する前に、書いている最中に分かる**という点が重要です。

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

### Q2. インストール直後に最初に確認すべきことは何ですか?

- A. VS Codeのテーマを変える
- B. ターミナルで`node -v`と`npm -v`を実行する
- C. すぐに`index.ts`を書き始める

<details>
<summary>答え</summary>

**B** — 両方バージョンが表示されれば、道具が入った証拠です。

</details>

### Q3. `npx tsc index.ts` を実行すると何が起きますか?

- A. `index.ts`が実行される
- B. `index.js`が生成される
- C. 型チェックだけ行われる

<details>
<summary>答え</summary>

**B** — 変換されたJavaScriptのファイルができます。実行するにはさらに`node index.js`が必要です。

</details>

### Q4. TypeScriptの入れ方として、本研修が教えるのはどれですか?

- A. PC全体に1つだけ入れる
- B. プロジェクトのフォルダごとに`npm`で入れる
- C. ブラウザの拡張機能で入れる

<details>
<summary>答え</summary>

**B** — 実務でもプロジェクト単位が普通です。`npx`でそのフォルダの`tsc`を呼びます。

</details>
