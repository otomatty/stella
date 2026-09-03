# レッスン1-1 演習 — TypeScriptを動かす環境を作る

対象トピック: 1-1-1 〜 1-1-5

## 手元で試す

この講座の演習は、ここで作る `~/ts-node-practice` の 1 プロジェクトをレッスン5-1まで使い続けます。`tsc` は `src/` の**全ファイル**を検査するので、わざとエラーを起こしたファイルは、確かめたらその場で元に戻すか消してください(残すと以降の検査がずっと失敗します)。

新しいプロジェクトを作ります。

```bash
mkdir -p ~/ts-node-practice && cd ~/ts-node-practice
npm init -y
npm pkg set type=module
npm install -D typescript @types/node
npx tsc --version      # 出た版を控えておく
```

設定ファイルを作ります。

```bash
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "strict": true,
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  }
}
JSON
```

TypeScriptのファイルを書いて、変換して、実行します。

```bash
mkdir -p src
cat > src/app.ts <<'TS'
const port: number = 3000;
console.log("ポートは " + port);
TS

npx tsc            # dist/app.js が作られる
cat dist/app.js    # 型が消えていることを確かめる
node dist/app.js
```

型エラーを起こして、検査だけを走らせます。

```bash
cat > src/broken.ts <<'TS'
const price: number = 1000;
const label: string = price;
TS

npx tsc --noEmit
echo "終了ステータス: $?"      # => 1(失敗)
```

`src/broken.ts` を消してから、手順に名前を付けます。

```bash
rm src/broken.ts
npm pkg set scripts.build=tsc
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.start="node dist/app.js"

npm run typecheck && npm run build && npm start
```

## 演習問題

### 問1(基本)

TypeScriptを `dependencies` ではなく `devDependencies` に入れる理由を説明してください。

### 問2(基本)

`process.env.PORT` と書いたら `Cannot find name 'process'` と表示されました。原因と対処を書いてください。

### 問3(応用)

`tsc` と `tsc --noEmit` の違いを説明し、それぞれをどんな場面で使うか書いてください。

### 問4(応用)

`npm run build && npm start` のように `&&` でつなぐ理由を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

本番のサーバーで動くのは変換後のJavaScriptで、TypeScript本体は必要ないためです。

型の情報は変換の時点で取り除かれ、実行時には残りません。開発中だけ使う道具なので `devDependencies` に入れます。

</details>

<details>
<summary>問2の解答例</summary>

- 原因: TypeScriptはNode.jsの機能を最初から知らないため、`process` という名前を解決できないためです。
- 対処: `npm install -D @types/node` でNode.jsの型定義を入れます。

</details>

<details>
<summary>問3の解答例</summary>

- `tsc` — 型検査に加えて、変換後のJavaScriptを `outDir` に出力します。実行するファイルを作るとき(ビルド)に使います。
- `tsc --noEmit` — ファイルを出力せず、型検査だけを行います。変更を取り込む前の関門など、検査だけしたいときに使います。

</details>

<details>
<summary>問4の解答例</summary>

ビルドが成功したときだけ実行するためです。

`&&` は左が成功したときだけ右へ進みます。型エラーでビルドが失敗しているのに、古い `dist` の内容を実行してしまう事故を防げます。

</details>

## 確認クイズ

### Q1. TypeScriptを入れる場所として適切なものはどれですか。

- A. `dependencies`
- B. `devDependencies`
- C. `node_modules` に手で置く

<details>
<summary>答え</summary>

**B** — 本番で動くのは変換後のJavaScriptなので、開発中だけ使う道具として入れます。

</details>

### Q2. `tsconfig.json` の `strict` について正しいものはどれですか。

- A. 新規プロジェクトでは必ず有効にする
- B. 学習中は切っておくのが普通
- C. 実行速度に影響する設定

<details>
<summary>答え</summary>

**A** — 切ると型を書く効果が大きく下がります。実行速度とは関係ありません。

</details>

### Q3. `@types/node` を入れる目的はどれですか。

- A. Node.js本体をインストールする
- B. `process` や `node:fs` などNode.jsの機能に型を与える
- C. TypeScriptをJavaScriptに変換する

<details>
<summary>答え</summary>

**B** — 型情報だけを与えるパッケージです。実行時には何も足されません。

</details>

### Q4. 最近の Node.js は `node app.ts` を実行できますが、それでも `tsc` を使うのはなぜですか。

- A. 直接実行は型注釈を取り除くだけで、型検査も tsconfig の適用もしないから
- B. 直接実行すると動作が遅くなるから
- C. 直接実行では console.log が使えないから

<details>
<summary>答え</summary>

**A** — Node.js 22.18 以降は型注釈を取り除いて `.ts` をそのまま実行できます。ただし検査はしないので、「動いた」は「型が正しい」を意味しません。型を検査するために `tsc`(または `tsc --noEmit`)を使います。

</details>

### Q5. `tsc --noEmit` の説明として正しいものはどれですか。

- A. ファイルを出力せず、型検査だけを行う
- B. 型検査をせずに変換だけを行う
- C. エラーを無視して変換する

<details>
<summary>答え</summary>

**A** — `emit`(出力)しない、という意味です。エラーがあれば終了ステータス1で終わります。

</details>
