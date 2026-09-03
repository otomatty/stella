# レッスン3-1 モジュールに分ける

## このレッスンの目標

- [ ] `export` / `import` でファイルを分けて呼び出せる
- [ ] CommonJSとES Modulesの違いを説明できる
- [ ] 組み込みモジュールとnpmのパッケージを見分けられる

## 3-1-1 exportしたものだけが外から見える

> **1つのファイルが1つのモジュールで、exportを付けたものだけ外から使える**

1つのファイルが数百行になると、どこに何があるか分からなくなります。名前が衝突して、意図せず別の処理を上書きする事故も起きます。

- **モジュール** — 分割の単位になるファイル
- **export** — そのモジュールの外に公開する印

```js
// tax.js
const RATE = 0.1;                     // 外からは見えない

export function withTax(price) {      // 外から使える
  return Math.round(price * (1 + RATE));
}
```

大事なのは、**既定は非公開** だということです。ファイルの中で作った変数や関数は、そのファイルの持ち物です。外に見せたいものにだけ `export` の印を付けます。

`RATE` を隠せることには意味があります。他のファイルが同じ名前の変数を持っていても衝突しませんし、内部の作りを後から変えても、外に影響しません。

## 3-1-2 importで別のファイルから読み込む

> **importは、別のモジュールがexportしたものを名前を指定して読み込む**

分割しただけでは使えません。読み込む側の書き方が必要です。

```js
// app.js
import { withTax } from "./tax.js";

console.log(withTax(1000));   // => 1100
```

`import` はファイルの先頭にまとめて書きます。こうすると、**先頭を見るだけでそのファイルが何に依存しているかが分かります**。

指定するパスの `./` には意味があります。`./` で始まっていれば自分のプロジェクトのファイル、始まっていなければパッケージ(または組み込みモジュール)としてnpmの世界から探されます。この違いは、次のトピックとあわせて覚えてください。

## 3-1-3 requireとimportの2つの書き方がある

> **Node.jsにはrequireを使う古い方式とimportを使う新しい方式があり、package.jsonで切り替える**

ネットの記事によって `require` だったり `import` だったりします。まねして書いたら `Cannot use import statement outside a module` と怒られた、という経験をする人は多いはずです。

- **CommonJS** — `require` を使う、Node.js独自の古い方式
- **ES Modules** — `import` を使う、JavaScript標準の方式

Node.jsはCommonJSから始まりました。後からJavaScriptの標準としてES Modulesが定まったため、いまも両方が使われています。

切り替えは `package.json` の1行です。

```json
{ "type": "module" }
```

```js
import { withTax } from "./tax.js";   // ES Modules
const { withTax } = require("./tax"); // CommonJS
```

`"type": "module"` が書かれていなければCommonJSとして扱われます。先ほどのエラーは、CommonJSのプロジェクトで `import` を書いたときに出ます。

(CommonJS 側の `const { withTax } = require("./tax");` は、読み込んだものの中から `withTax` だけを取り出す書き方です。この講座では読めれば十分で、自分で書くのは `import` の方だけです。)

判断は単純です。**新しく作るならES Modules**、既存のプロジェクトに入るならそこに合わせます。1つのプロジェクトの中で混ぜないでください。

## 3-1-4 組み込みモジュールはnode:で読む

> **Node.jsに最初から入っている機能は、node:で始まる名前で読み込んで使う**

ファイルを読む機能はインストールが必要なのか、と迷うことがあります。答えは不要です。Node.jsは、環境として多くの機能を最初から持っています。

**組み込みモジュール** は、Node.js自体が持つ機能です。`npm install` は要りません。

```js
import { readFile } from "node:fs/promises";  // 組み込み
import dayjs from "dayjs";                     // npmで入れたもの
import { withTax } from "./tax.js";            // 自分のファイル
```

読み込むものの出どころは、名前の形で見分けられます。

| 書き方 | 出どころ | インストール |
|---|---|---|
| `node:` で始まる | Node.jsの組み込み | 不要 |
| `./` で始まる | 自分のプロジェクトのファイル | 不要 |
| それ以外 | npmのパッケージ | `npm install` が必要 |

よく使う組み込みモジュールは `node:fs`(ファイル)、`node:path`(パスの組み立て)、`node:http`(通信)です。次のモジュールから実際に使っていきます。

なお `node:` を付けずに `fs` と書くこともできますが、`node:` を付けておくと出どころが一目で分かるため、現在はこちらが推奨されています。

## もっと知りたい人へ

- [Node.js Docs — Modules: ECMAScript modules](https://nodejs.org/api/esm.html) — ES Modulesの公式ドキュメント
- [Node.js Docs — Modules: CommonJS](https://nodejs.org/api/modules.html) — CommonJSの公式ドキュメント

---

演習は [practice.md](practice.md) にあります。
