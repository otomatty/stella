# レッスン4-1 ファイルと入出力

## このレッスンの目標

- [ ] `node:fs` でファイルを読み書きできる
- [ ] `node:path` でパスを組み立てられる
- [ ] `process.argv` と `process.env` で外から値を受け取れる

## 4-1-1 node:fsでファイルを読む

> **node:fs/promisesのreadFileで、ファイルの中身を文字列として読み込める**

設定ファイルやCSVを読んで処理する。レッスン0-1で見たとおり、これはブラウザのJavaScriptにはできなかったことです。

**fs**(file system)は、ファイルを扱う組み込みモジュールです。

```js
import { readFile } from "node:fs/promises";

const text = await readFile("memo.txt", "utf-8");
console.log(text);
```

第2引数の `"utf-8"` は **文字エンコーディング** の指定です。文字をコンピューターがどう表すかの方式で、これを省くと文字列ではなく生のデータ(バイト列)が返ります。日本語を含むテキストを読むときは必ず指定してください。

`await` は「終わるまで待つ」という印です。ファイルの読み込みには時間がかかるため、この書き方が必要になります。理由はモジュール5で扱うので、いまは形として覚えてください。

なお `node:fs/promises` は、`await` と組み合わせて使える新しい書き方です。古い記事では `node:fs` と `callback` を使う形も見かけますが、新しく書くならこちらを選びます。

## 4-1-2 writeFileは上書きする

> **writeFileはファイルに書き出す。既にあるファイルの中身は置き換わる**

処理した結果を、次の工程が使えるファイルとして残します。画面に出すだけでは、後の処理に渡せません。

```js
import { writeFile, appendFile } from "node:fs/promises";

await writeFile("out.txt", "1行目\n");        // 置き換え(> と同じ)
await appendFile("out.txt", "2行目\n");       // 追記(>> と同じ)
```

コマンドライン入門で学んだ `>` と `>>` の関係が、そのまま当てはまります。

- `writeFile` — 既にある中身を **置き換える**(`>` と同じ)
- `appendFile` — 末尾に **書き足す**(`>>` と同じ)

確認は出ません。書き出し先のパスは、実行前に必ず読み返してください。プログラムから実行される分、手で打つときより事故が広がりやすい操作です。

## 4-1-3 パスの組み立てはnode:pathに任せる

> **パスを文字列で連結せず、node:pathのjoinで組み立てる**

`"logs" + "/" + name` のような連結は、区切り記号が二重になったり足りなかったりして壊れます。さらに、環境によって区切り記号そのものが違います(macOS・Linuxは `/`、Windowsは `\`)。

**path** は、パスを組み立て・分解する組み込みモジュールです。

```js
import { join } from "node:path";

join("logs", "2026", "app.log");   // => logs/2026/app.log
join("logs/", "/app.log");         // => logs/app.log (重複も直る)
```

`join` は、区切り記号の重複や不足を直し、環境ごとの違いも吸収します。**区切り記号を自分で書かない** ようにするだけで、環境差で壊れるコードが1つ減ります。

## 4-1-4 process.argvでコマンドライン引数を受け取る

> **コマンドラインで渡した引数は、process.argvの3番目以降に入る**

対象のファイル名だけが違うプログラムを何本も作ってしまうのは、コマンドライン入門のシェルスクリプトで扱った問題と同じです。あちらでは `$1` で受け取りました。Node.jsでも同じことができます。

- **process** — 実行中の自分自身の情報を持つオブジェクト
- **argv** — 渡された引数の一覧

```js
// greet.js
const name = process.argv[2];
console.log(name + " さん、こんにちは");
```

```bash
node greet.js 佐藤
# argv[0] = nodeの場所  argv[1] = greet.jsの場所  argv[2] = 佐藤
```

3番目(添字は2)から始まるのには理由があります。0番目にはNode.js自体の場所が、1番目には実行しているファイルの場所が入っているためです。暗記ではなく、この理由で覚えてください。

## 4-1-5 process.envで環境変数を読む

> **環境変数はprocess.envから読み、接続先や鍵はコードに書かず外から渡す**

接続先やパスワードをコードに書くと、そのままGitの履歴に残ります。一度入ってしまった秘密の値は、後から消すのが困難です。また、開発と本番で値を変えたいのに、コードが同じでは切り替えられません。

コマンドライン入門で学んだ **環境変数** が、ここで効いてきます。シェルが持つ値は、起動したプログラムに引き継がれます。

```js
const port = process.env.PORT;
console.log("ポートは " + port);
```

```bash
PORT=3000 node app.js
# => ポートは 3000
```

`process.env` は環境変数を集めたオブジェクトで、`process.env.PORT` のように名前で取り出します。

渡し忘れると `undefined`(値が無い状態)になります。動かしてみて `undefined` と出たら、コードではなく渡し方を疑ってください。実務では、渡されなかったときの既定値を決めておくのが普通です。

## もっと知りたい人へ

- [Node.js Docs — File system](https://nodejs.org/api/fs.html) — `fs` の公式ドキュメント
- [Node.js Docs — Path](https://nodejs.org/api/path.html) — `path` の公式ドキュメント
- [Node.js Docs — Process](https://nodejs.org/api/process.html) — `process.argv` / `process.env`

---

演習は [practice.md](practice.md) にあります。
