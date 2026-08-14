# レッスン9-4 演習 — PrettierとESLint

対象トピック: 9-4-1 〜 9-4-4

## ハンズオン

レッスン9-3で作ったフォルダで作業します。

```bash
npm install --save-dev prettier
```

わざと書式を崩したファイル`messy.ts`を作ってください。

```ts
const user = {name:"田中",  age:28}
    const greet = (n:string)=>{
  return `${n}さん`
    }
console.log(greet(user.name))
```

```bash
npx prettier --check messy.ts
```

```bash
npx prettier --write messy.ts
```

写経できたら、次の改造をしてみましょう。

1. `--write`の前後でファイルがどう変わったか見比べましょう
2. `node dist/messy.js`(または変換して実行)で、**動きは変わっていない**ことを確認しましょう
3. VS Codeの拡張機能「Prettier」を入れ、保存時整形を有効にしてみましょう

## 演習問題

### 問1(基本)

`npx prettier --check` と `npx prettier --write` の違いを説明してください。どちらをCIで使うべきかも答えてください。

### 問2(基本)

次の2つの問題は、PrettierとESLintのどちらが検出しますか。理由も説明してください。

- インデントがスペース4つになっている
- `if (a == b)` と書いている

### 問3(応用)

`package.json`の`scripts`に、push前の3点セットをまとめる設定を書いてください。`npm run check`の1コマンドで全部走るようにしてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

- **`--check`** — 整形が必要なファイルを**報告するだけ**。ファイルは書き換えない
- **`--write`** — 実際にファイルを**書き換える**

**CIで使うのは`--check`です。** CIの役割は「基準を満たしているかの判定」であって、コードを書き換えることではありません。整形されていなければ失敗として報告し、開発者に手元で直してもらいます。

CIが勝手に書き換えると、手元のコードとリポジトリの内容が食い違って混乱します。

</details>

<details>
<summary>問2の解答例</summary>

- **インデントがスペース4つ** → **Prettier**。見た目の問題で、動作には影響しません
- **`if (a == b)`** → **ESLint**。動作に影響する書き方の問題です

`==`は型が違っても暗黙の変換をして比較するため、意図しない結果になることがあります。レッスン2-2で「常に`===`を使う」と決めたのはこのためです。

**Prettierは見た目、ESLintは中身**という役割分担です。どちらか一方ではなく、両方入れます。

</details>

<details>
<summary>問3の解答例</summary>

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check src",
    "lint": "eslint src",
    "check": "npm run typecheck && npm run format:check && npm run lint"
  }
}
```

```bash
npm run check
```

個別にも実行できるよう分けたうえで、`check`でまとめて呼び出しています。`&&`でつなぐと、どれか1つでも失敗した時点で止まります。

**CIでも同じ`npm run check`を実行します。** 手元とCIで同じコマンドが動けば、「手元では通ったのにCIで落ちた」という事故が減ります。

`scripts`に書いた名前は`npm run 名前`で実行できます(レッスン9-2)。

</details>

## 確認クイズ

### Q1. Prettierはコードの動作を変えますか?

- A. 変える
- B. 変えない。見た目だけを整える

<details>
<summary>答え</summary>

**B** — 中身は一切変わらないので、安心して実行できます。

</details>

### Q2. Prettierの設定項目が少ないのはなぜですか?

- A. 開発が止まっているから
- B. 「議論を終わらせる」という設計思想のため

<details>
<summary>答え</summary>

**B** — 選べる余地を減らすことで、書式の議論をなくしています。既定のまま使うのが基本です。

</details>

### Q3. ESLintが検出するのはどれですか?

- A. インデントの幅
- B. 使っていない変数や`==`の使用

<details>
<summary>答え</summary>

**B** — 見た目はPrettierの担当です。ESLintは書き方の問題を見ます。

</details>

### Q4. CIで検査を回す目的はどれですか?

- A. コードを自動で修正するため
- B. 壊れたコードが本番に届かないようにするため

<details>
<summary>答え</summary>

**B** — 検査に落ちればマージできません。人の意志に頼らず、仕組みで守ります。

</details>
