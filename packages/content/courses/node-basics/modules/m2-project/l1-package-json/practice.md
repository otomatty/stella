# レッスン2-1 演習 — プロジェクトとパッケージ

対象トピック: 2-1-1 〜 2-1-5

## 手元で試す

新しいプロジェクトを作ります。

```bash
mkdir -p ~/node-practice/shop && cd ~/node-practice/shop
npm init -y
cat package.json        # 何が書かれたか読む
```

パッケージを入れて、何が変わるか確かめます。

```bash
npm install dayjs
cat package.json        # dependencies が増えている
ls node_modules | head  # 実体が置かれている
ls package-lock.json    # lock ファイルができている
```

入れたパッケージを使ってみます。

```bash
cat > app.js <<'JS'
const dayjs = require("dayjs");
console.log("今日は " + dayjs().format("YYYY-MM-DD") + " です");
JS

node app.js
```

手順に名前を付けます。`package.json` の `scripts` を次のように編集してください。

```json
"scripts": {
  "start": "node app.js"
}
```

```bash
npm start
```

最後に、開発用の道具を入れて置き場所の違いを見ます。

```bash
npm install -D typescript
cat package.json        # devDependencies に入っている
```

## 演習問題

### 問1(基本)

新しいプロジェクトで `package.json` を作るコマンドを書いてください。

### 問2(基本)

`npm install dayjs` を実行したとき、変わる2か所を挙げてください。

### 問3(応用)

`node_modules` はGitにコミットせず、`package-lock.json` はコミットします。それぞれの理由を1文ずつで説明してください。

### 問4(応用)

次のうち `devDependencies` に入れるべきものはどれですか。理由も書いてください。

- 本番のサーバーで日付を整形するために使うライブラリ
- コードの書き方を検査するために開発中だけ使うツール

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
npm init -y
```

`-y` はすべての質問に既定値で答えるオプションです。対話的に決めたい場合は `-y` を外します。

</details>

<details>
<summary>問2の解答例</summary>

1. `package.json` の `dependencies` に `dayjs` が追記される
2. `node_modules` にパッケージの実体が置かれる(あわせて `package-lock.json` に実際の版が記録される)

</details>

<details>
<summary>問3の解答例</summary>

- `node_modules`: `package.json` と lock ファイルがあれば `npm install` で復元できるためです(数万ファイルになることもあり、記録する価値がありません)。
- `package-lock.json`: 実際に入れた版の組み合わせを共有し、誰の環境でも同じ状態を再現するためです。

</details>

<details>
<summary>問4の解答例</summary>

「コードの書き方を検査するために開発中だけ使うツール」です。

判断基準は「本番で動かすときに要るかどうか」です。日付を整形するライブラリは本番のコードが使うので `dependencies` に入れます。

</details>

## 確認クイズ

### Q1. `package.json` の説明として正しいものはどれですか。

- A. プロジェクトの名前・使う道具・実行手順を書いた説明書
- B. パッケージの実体が置かれるディレクトリ
- C. 実行時のログを記録するファイル

<details>
<summary>答え</summary>

**A** — 人もnpmも同じファイルを読みます。実体が置かれるのは `node_modules` です。

</details>

### Q2. `npm install dayjs` を実行すると `dayjs` の実体はどこに置かれますか。

- A. `package.json`
- B. `node_modules`
- C. `package-lock.json`

<details>
<summary>答え</summary>

**B** — 実体は `node_modules` に置かれ、`package.json` には使っているという記録が追記されます。

</details>

### Q3. Gitにコミットするファイルの組み合わせとして正しいものはどれですか。

- A. `package.json` と `package-lock.json`(`node_modules` はコミットしない)
- B. `node_modules` だけ
- C. `package.json` だけ(lockファイルはコミットしない)

<details>
<summary>答え</summary>

**A** — lockファイルは再現性のためにコミットします。`node_modules` は復元できるのでコミットしません。

</details>

### Q4. `npm run check` の `check` はどこに書かれていますか。

- A. `node_modules` の中
- B. `package.json` の `scripts`
- C. `package-lock.json`

<details>
<summary>答え</summary>

**B** — `scripts` に書いた名前を `npm run 名前` で呼び出します。`start` と `test` は `run` を省略できます。

</details>

### Q5. `devDependencies` に入れるべきパッケージはどれですか。

- A. 本番のコードが実行時に使うライブラリ
- B. 開発中だけ使う、テストや検査のためのツール
- C. Node.js本体

<details>
<summary>答え</summary>

**B** — 判断基準は「本番で動かすときに要るか」です。要らないものは `-D` を付けて開発用として入れます。

</details>
