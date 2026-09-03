# レッスン1-1 TypeScriptを動かす環境を作る

## このレッスンの目標

- [ ] TypeScriptと`@types/node`を開発用として導入できる
- [ ] `tsconfig.json` の最小の設定を書ける
- [ ] ビルドと型検査を `npm scripts` から実行できる

## 1-1-1 TypeScriptは開発用の道具として入れる

> **TypeScriptはdevDependenciesに入れる。本番で動くのは変換後のJavaScript**

Node.js入門で、パッケージは「本番で動かすときに要るか」で入れ分けると学びました。TypeScriptはどちらでしょうか。

- **コンパイル** — TypeScriptをJavaScriptに変換すること
- **tsc** — その変換を行うコマンド(TypeScript Compiler)

```bash
npm install -D typescript
npx tsc --version
# => Version 5.9.3(版は入れた時期で変わります)
```

答えは `devDependencies` です。**本番のサーバーで動くのは、変換後のJavaScript** だからです。型の情報は変換の時点で取り除かれ、実行時には残りません。だから本番環境にTypeScript本体を配る必要はありません。

`npx` は、プロジェクトに入れた道具を実行するコマンドです。`node_modules` の中にある `tsc` を探して動かしてくれます。

## 1-1-2 tsconfig.jsonが変換の設定を持つ

> **tsconfig.jsonは、どのファイルをどう変換し、どこまで厳しく検査するかを決める**

変換のたびに長いオプションを打つのは現実的ではありませんし、チーム全員が同じ厳しさで検査していなければ意味が薄れます。設定はファイルに置きます。

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2022",
    "module": "node16",
    "outDir": "dist",
    "types": ["node"]
  }
}
```

この講座で扱うのは4項目だけです。

| 項目 | 意味 |
|---|---|
| `strict` | 検査を厳しくする。**新規プロジェクトでは必ず有効にする** |
| `target` | 変換後のJavaScriptがどの世代の書き方を使うか |
| `module` | モジュールの解決方式(Node.js向けは `node16`) |
| `outDir` | 変換後のJavaScriptの置き場所 |
| `types` | 読み込む型定義。`["node"]` で次のトピックの `@types/node` を確実に読ませる |

**strict** は特に重要です。これを切ると、値が無いかもしれない箇所の検査などが緩くなり、型を書く効果が大きく下がります。既存のプロジェクトを少しずつ移行する場面を除いて、切る理由はありません。

他にも多くの設定項目がありますが、必要になったときに調べれば十分です。

## 1-1-3 Node.jsの型定義を入れる

> **@types/nodeを入れると、processやnode:fsに型が付いて補完と検査が効く**

`process.argv` と書いたら `Cannot find name 'process'`(process という名前が見つかりません)と怒られた、という経験をします。Node.jsの機能なのに、なぜでしょうか。

理由は、**TypeScriptがNode.jsの存在を最初から知らない** ためです。TypeScriptはJavaScriptの言語仕様しか知らず、実行環境が何を提供するかは別に教える必要があります。それが **型定義** の役割です。

```bash
npm install -D @types/node
```

```ts
const port: string | undefined = process.env.PORT;   // 型が付く
```

`@types/node` は、Node.jsの機能に型を与えるパッケージです。これを入れると、`process` や `node:fs` に型が付き、エディタの補完も効くようになります。

型情報だけを与えるパッケージなので、実行時には何も足されません。だから `devDependencies` に入れます。

なお、入れただけで読み込まれるかは TypeScript の版によって違います。5 系は `node_modules/@types` を自動で読みますが、7 系は読みません。前のトピックの `tsconfig.json` に `"types": ["node"]` を書いておけば、どちらの版でも確実に読み込まれます(この 1 行が無いと 7 系では `Cannot find name 'process'` のままです)。

## 1-1-4 TypeScriptをNode.jsで動かす

> **tscでJavaScriptに変換してからnodeで実行するのが、動かし方の基本**

`node app.ts` と打つと、最近の Node.js(22.18 以降・24)ではそのまま動きます。型注釈を **取り除いてから** 実行する機能が標準で入ったためです。ただし取り除くだけで、**型検査はしません**。`tsconfig.json` の設定も効きません。つまり「動いた」ことは「型が正しい」ことを意味しません。

この講座で `tsc` を使うのは、実行できるようにするためではなく、**実行する前に型を検査するため**です。検査と変換をまとめて行うのが `tsc` の役割です。

**ビルド** は、書いたコードを実行できる形にする作業のことです。

```bash
npx tsc              # src/app.ts → dist/app.js
node dist/app.js     # 変換後のJavaScriptを実行
```

手順は `npm scripts` に名前を付けて残します。

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/app.js"
}
```

```bash
npm run build && npm start
```

`&&` でつないでいるのは、コマンドライン入門で学んだとおり、**ビルドが成功したときだけ実行する** ためです。型エラーがあるまま古い `dist` を動かしてしまう事故を防げます。

近年のNode.jsにはTypeScriptを直接実行する機能もありますが、まずは「変換してから実行する」という基本の形を理解してください。本番環境で動くのが変換後のJavaScriptであることは変わりません。

## 1-1-5 型検査だけを走らせる

> **tsc --noEmitは、ファイルを出さずに型の検査だけを行う**

型が合っているかだけを確かめたいのに、毎回ファイルが生成されるのは無駄です。検査と生成は分けられます。

**型検査** は、型が矛盾していないかを調べることです。

```bash
npx tsc --noEmit     # 検査だけ。dist は作られない
```

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "build": "tsc"
}
```

`emit` は「出力する」という意味なので、`--noEmit` は「出力しない」です。

型エラーが1つでもあれば、`tsc` は終了ステータス1(失敗)で終わります。コマンドライン入門で学んだとおり、この値があるおかげで自動化の部品として使えます。実務では、変更をチームのリポジトリに取り込む前にこの検査を走らせ、失敗したら取り込まない、という関門を作ります。

## もっと知りたい人へ

- [TypeScript Docs — tsconfig リファレンス](https://www.typescriptlang.org/tsconfig) — 設定項目の一覧
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) — `@types/*` の型定義が集まっている場所

---

演習は [practice.md](practice.md) にあります。
