# レッスン5-1 演習 — 非同期処理

対象トピック: 5-1-1 〜 5-1-4

## 手元で試す

準備をします。

```bash
mkdir -p ~/node-practice/async && cd ~/node-practice/async
npm init -y && npm pkg set type=module
echo "メモの中身" > memo.txt
```

`await` を付けない場合と付けた場合を見比べます。

```bash
cat > p.js <<'JS'
import { readFile } from "node:fs/promises";

const p = readFile("memo.txt", "utf-8");
console.log("await なし:", p);

const text = await readFile("memo.txt", "utf-8");
console.log("await あり:", text);
JS

node p.js
```

実行の順番を確かめます。予想してから実行してください。

```bash
cat > order.js <<'JS'
console.log("1: はじめ");
setTimeout(() => console.log("2: 1秒後"), 1000);
console.log("3: おわり");
JS

node order.js
```

失敗を受け止めます。

```bash
cat > safe.js <<'JS'
import { readFile } from "node:fs/promises";

try {
  const text = await readFile("nofile.txt", "utf-8");
  console.log(text);
} catch (error) {
  console.error("nofile.txt を読めませんでした");
  process.exit(1);
}
JS

node safe.js
echo "終了ステータス: $?"      # => 1
node safe.js && echo "続きを実行"   # 失敗なので続きは動かない
```

## 演習問題

### 問1(基本)

`readFile` に `await` を付けずに結果を `console.log` すると何が表示されますか。

### 問2(基本)

関数の中で `await` を使うとき、その関数に付ける必要がある印は何ですか。

### 問3(応用)

`order.js` の実行結果が「1 → 3 → 2」の順になる理由を説明してください。

### 問4(応用)

`catch` の中で `console.error` と `process.exit(1)` を書く理由を、それぞれ1文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`Promise { <pending> }` と表示されます。

`readFile` が返すのは結果そのものではなく、後で結果を渡すという約束(Promise)だからです。`<pending>` は処理中という意味です。

</details>

<details>
<summary>問2の解答例</summary>

`async` です。

```js
async function load() {
  return await readFile("memo.txt", "utf-8");
}
```

ES Modulesではファイルの一番外側でも `await` を書けますが、関数の中では `async` が必要です。

</details>

<details>
<summary>問3の解答例</summary>

`setTimeout` は「1秒後に実行する」という予約をするだけで、その場では待たないためです。

予約したあと処理は次の行へ進み、「3: おわり」が先に出ます。1秒後、イベントループが予約された処理を取り出して「2: 1秒後」が実行されます。

</details>

<details>
<summary>問4の解答例</summary>

- `console.error`: エラーの知らせを標準エラー出力へ流し、正常な結果と混ざらないようにするためです。
- `process.exit(1)`: 失敗したことを終了ステータスで後続に伝え、`&&` でつないだ次の処理が走らないようにするためです。

</details>

## 確認クイズ

### Q1. Node.jsの実行の仕組みとして正しいものはどれですか。

- A. 処理の流れが1本(シングルスレッド)で、イベントループが順に処理を取り出す
- B. リクエストごとに新しい流れが作られ、並行して実行される
- C. すべての処理が同時に実行される

<details>
<summary>答え</summary>

**A** — 窓口は1つです。だからこそ、待ち時間に窓口を占有しない非同期処理が重要になります。

</details>

### Q2. `readFile` が返すものはどれですか。

- A. ファイルの中身そのもの
- B. 後で結果を渡すという約束(Promise)
- C. ファイルのパス

<details>
<summary>答え</summary>

**B** — 引換券のようなものです。中身を使うには `await` で結果を受け取ります。

</details>

### Q3. `await` の説明として正しいものはどれですか。

- A. Promiseの結果が返るまで待ってから次の行へ進む
- B. 処理を並行して実行する
- C. エラーを無視して続行する

<details>
<summary>答え</summary>

**A** — 自分の続きだけを待たせます。その間、Node.jsは他の処理を進められます。

</details>

### Q4. `try-catch` を書く目的はどれですか。

- A. 処理を速くするため
- B. 失敗したときに例外を受け止め、続きをどうするか決めるため
- C. 非同期処理を同期処理に変えるため

<details>
<summary>答え</summary>

**B** — 何も書かなければプログラムはそこで止まります。受け止めて、何が起きたかを伝えます。

</details>

### Q5. `process.exit(1)` を書くと何が変わりますか。

- A. 終了ステータスが1(失敗)になり、`&&` でつないだ次の処理が走らなくなる
- B. エラーメッセージが自動で表示される
- C. プログラムが最初からやり直される

<details>
<summary>答え</summary>

**A** — 失敗を終了ステータスで伝えられるので、シェルスクリプトの部品として安全に組み込めます。

</details>
