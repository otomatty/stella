# レッスン4-1 演習 — ファイルと入出力

対象トピック: 4-1-1 〜 4-1-5

## 手元で試す

ES Modulesの設定をしたプロジェクトを用意します。

```bash
mkdir -p ~/node-practice/io && cd ~/node-practice/io
npm init -y && npm pkg set type=module
printf '佐藤,1200\n田中,800\n' > sales.csv
```

ファイルを読みます。

```bash
cat > read.js <<'JS'
import { readFile } from "node:fs/promises";

const text = await readFile("sales.csv", "utf-8");
console.log(text);
JS

node read.js
```

読んだ結果を別のファイルに書き出します。

```bash
cat > write.js <<'JS'
import { readFile, writeFile, appendFile } from "node:fs/promises";

const text = await readFile("sales.csv", "utf-8");
await writeFile("out.txt", "取り込み結果\n");
await appendFile("out.txt", text);
JS

node write.js
cat out.txt
```

引数と環境変数を受け取ります。

```bash
cat > greet.js <<'JS'
const name = process.argv[2];
console.log(name + " さん、こんにちは");
console.log("環境は " + process.env.APP_ENV);
JS

node greet.js 佐藤                  # 環境変数は undefined になる
APP_ENV=development node greet.js 佐藤
```

最後に、パスの組み立てを試します。

```bash
cat > join.js <<'JS'
import { join } from "node:path";

console.log(join("logs/", "/2026", "app.log"));
JS

node join.js      # => logs/2026/app.log
```

## 演習問題

### 問1(基本)

`memo.txt` の中身を文字列として読み込むコードを書いてください。

### 問2(基本)

`writeFile` と `appendFile` の違いを説明してください。コマンドライン入門で学んだどの記号に対応しますか。

### 問3(応用)

`readFile("memo.txt")` のように第2引数を省くと、日本語のテキストが読めません。理由と対処を書いてください。

### 問4(応用)

`node app.js report.csv` と実行したとき、`report.csv` を受け取るコードはどう書きますか。なぜその添字になるのかも説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```js
import { readFile } from "node:fs/promises";

const text = await readFile("memo.txt", "utf-8");
```

第2引数に文字エンコーディングを指定すると、文字列として受け取れます。

</details>

<details>
<summary>問2の解答例</summary>

- `writeFile` — 既にある中身を置き換えます(シェルの `>` に対応)
- `appendFile` — 末尾に書き足します(シェルの `>>` に対応)

どちらも確認は出ないので、書き出し先のパスは実行前に確認します。

</details>

<details>
<summary>問3の解答例</summary>

- 理由: 文字エンコーディングを指定しないと、文字列ではなく生のデータ(バイト列)が返るためです。
- 対処: `readFile("memo.txt", "utf-8")` のように第2引数を指定します。

</details>

<details>
<summary>問4の解答例</summary>

```js
const file = process.argv[2];
```

`process.argv` の0番目にはNode.js自体の場所、1番目には実行中のファイルの場所が入っています。渡した引数は3番目(添字2)からになります。

</details>

## 確認クイズ

### Q1. ファイルを読む組み込みモジュールはどれですか。

- A. `node:path`
- B. `node:fs`
- C. `node:http`

<details>
<summary>答え</summary>

**B** — `fs`(file system)がファイルを扱います。`path` はパスの組み立て、`http` は通信です。

</details>

### Q2. `readFile("memo.txt", "utf-8")` の `"utf-8"` は何を指定していますか。

- A. 文字エンコーディング
- B. ファイルの権限
- C. 読み込む行数

<details>
<summary>答え</summary>

**A** — 文字エンコーディングです。省くと文字列ではなく生のデータが返ります。

</details>

### Q3. `writeFile` を既存のファイルに対して実行するとどうなりますか。

- A. 末尾に追記される
- B. 中身が置き換わる
- C. エラーになる

<details>
<summary>答え</summary>

**B** — シェルの `>` と同じで置き換えです。追記したいときは `appendFile` を使います。

</details>

### Q4. パスを組み立てるときに `node:path` の `join` を使う理由はどれですか。

- A. 文字列の連結より実行が速いから
- B. 区切り記号の重複や不足、環境ごとの違いを吸収してくれるから
- C. ファイルの存在を確認してくれるから

<details>
<summary>答え</summary>

**B** — 区切り記号を自分で書かないことで、環境差で壊れるコードを減らせます。存在確認はしません。

</details>

### Q5. 接続先やパスワードをコードに直接書かず、環境変数から読む理由として最も適切なものはどれですか。

- A. コードが短くなるから
- B. Gitの履歴に秘密の値が残らず、環境ごとに値を切り替えられるから
- C. 実行速度が上がるから

<details>
<summary>答え</summary>

**B** — 設定を外に出すことで、秘密を残さず、同じコードのまま環境ごとに値を変えられます。

</details>
