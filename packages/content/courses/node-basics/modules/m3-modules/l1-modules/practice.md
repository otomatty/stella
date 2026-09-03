# レッスン3-1 演習 — モジュールに分ける

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

ES Modulesを使う設定にしてから、ファイルを分けます。

```bash
mkdir -p ~/node-practice/modules && cd ~/node-practice/modules
npm init -y
npm pkg set type=module      # package.json に "type": "module" を足す
cat package.json
```

公開する側と読み込む側の2ファイルを作ります。

```bash
cat > tax.js <<'JS'
const RATE = 0.1;

export function withTax(price) {
  return Math.round(price * (1 + RATE));
}
JS

cat > app.js <<'JS'
import { withTax } from "./tax.js";
console.log(withTax(1000));
JS

node app.js       # => 1100
```

公開していないものは見えないことを確かめます。

```bash
cat > ng.js <<'JS'
import { RATE } from "./tax.js";
console.log(RATE);
JS

node ng.js        # export していないのでエラーになる
```

組み込みモジュールも読み込んでみます。

```bash
cat > sys.js <<'JS'
import { join } from "node:path";
console.log(join("logs", "2026", "app.log"));
JS

node sys.js       # => logs/2026/app.log
```

## 演習問題

### 問1(基本)

`tax.js` の `withTax` 関数を、別のファイルから使えるようにするには何を書きますか。

### 問2(基本)

`import { withTax } from "./tax.js";` の `./` にはどんな意味がありますか。

### 問3(応用)

`Cannot use import statement outside a module` というエラーが出ました。原因と対処を説明してください。

### 問4(応用)

次の3つの `import` は、それぞれ何を読み込んでいますか。`npm install` が必要なものはどれですか。

```js
import { readFile } from "node:fs/promises";
import dayjs from "dayjs";
import { withTax } from "./tax.js";
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

関数の宣言に `export` を付けます。

```js
export function withTax(price) { ... }
```

`export` を付けていないものは、そのファイルの中だけの持ち物です。

</details>

<details>
<summary>問2の解答例</summary>

自分のプロジェクトの中のファイルを指す、という意味です。

`./` が無い場合は、npmのパッケージまたは組み込みモジュールとして探されます。

</details>

<details>
<summary>問3の解答例</summary>

- 原因: そのプロジェクトがCommonJSとして扱われているのに、ES Modulesの `import` を書いたためです。
- 対処: `package.json` に `"type": "module"` を足します(または `require` の書き方に合わせます)。

</details>

<details>
<summary>問4の解答例</summary>

- `node:fs/promises` — Node.jsの組み込みモジュール。インストール不要
- `dayjs` — npmのパッケージ。**`npm install` が必要**
- `./tax.js` — 自分のプロジェクトのファイル。インストール不要

名前の形で出どころが見分けられます。

</details>

## 確認クイズ

### Q1. モジュールの外から使えるものはどれですか。

- A. そのファイルに書かれたすべての変数と関数
- B. `export` を付けたものだけ
- C. 関数だけ(変数は必ず非公開)

<details>
<summary>答え</summary>

**B** — 既定は非公開で、`export` を付けたものだけが外から見えます。

</details>

### Q2. 自分のプロジェクトのファイルを読み込むときの書き方はどれですか。

- A. `import { f } from "./util.js";`
- B. `import { f } from "util";`
- C. `import { f } from "node:util";`

<details>
<summary>答え</summary>

**A** — `./` で始めると自分のファイルを指します。`./` が無ければパッケージや組み込みモジュールとして探されます。

</details>

### Q3. `require` を使う方式の名前はどれですか。

- A. ES Modules
- B. CommonJS
- C. TypeScript

<details>
<summary>答え</summary>

**B** — `require` はCommonJS、`import` はES Modulesです。

</details>

### Q4. プロジェクトでES Modulesを使うために `package.json` に書く設定はどれですか。

- A. `"type": "module"`
- B. `"module": true`
- C. `"esm": "on"`

<details>
<summary>答え</summary>

**A** — この1行が無いとCommonJSとして扱われ、`import` がエラーになります。

</details>

### Q5. `import { readFile } from "node:fs/promises";` について正しいものはどれですか。

- A. `npm install fs` が必要
- B. Node.jsの組み込みモジュールなのでインストールは不要
- C. 自分のプロジェクトのファイルを読み込んでいる

<details>
<summary>答え</summary>

**B** — `node:` で始まる名前は組み込みモジュールで、最初から使えます。

</details>
