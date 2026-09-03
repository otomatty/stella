# レッスン1-1 演習 — JavaScriptを実行する

対象トピック: 1-1-1 〜 1-1-4

## 手元で試す

練習用のディレクトリを作り、最初のスクリプトを書きます。

```bash
mkdir -p ~/node-practice && cd ~/node-practice

cat > app.js <<'JS'
const message = "はじめてのNode.js";
console.log(message);
JS

node app.js
```

REPLを開いて、1行ずつ試します。

```text
$ node
> 1 + 2
> const name = "佐藤"
> "こんにちは " + name
> .exit
```

`console.log` の出力が標準出力であることを確かめます。

```bash
node app.js > result.txt      # 画面に出ず、ファイルに入る
cat result.txt
node app.js | grep Node       # パイプで次のコマンドに渡せる
```

最後に、わざとエラーを起こして読み方を練習します。

```bash
cat > broken.js <<'JS'
const user = undefined;
console.log(user.name);
JS

node broken.js
```

表示された内容から、種類・メッセージ・行番号の3点を書き出してみてください。

## 演習問題

### 問1(基本)

`hello.js` に書いた処理を実行するコマンドを書いてください。

### 問2(基本)

ファイルを作らずに `3 * 7` の結果をその場で確かめたいとき、どうしますか。

### 問3(応用)

`node app.js > out.txt` を実行すると画面に何も出ませんでした。失敗したのでしょうか。理由を説明してください。

### 問4(応用)

次のエラーから、読むべき3点をそれぞれ書き出してください。

```text
/Users/sato/app.js:5
console.log(order.total);
                  ^
TypeError: Cannot read properties of undefined
    at Object.<anonymous> (/Users/sato/app.js:5:19)
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```bash
node hello.js
```

`node` がコマンド名、`hello.js` が引数です。ファイルに書いた処理が上から順に実行されます。

</details>

<details>
<summary>問2の解答例</summary>

`node` とだけ打ってREPLを開き、`3 * 7` と入力します。

REPLは1行ずつ実行して結果をその場で返します。抜けるときは `.exit` です。

</details>

<details>
<summary>問3の解答例</summary>

失敗ではありません。`console.log` の出力は標準出力に流れており、`>` によって行き先がファイルへ変わったためです。

`cat out.txt` で中身を確認できます。

</details>

<details>
<summary>問4の解答例</summary>

- 種類: `TypeError`
- メッセージ: `Cannot read properties of undefined`(中身の無いものから値を取り出そうとした)
- 場所: `/Users/sato/app.js` の5行目

`order` に値が入っていない状態で `order.total` を読もうとしたことが分かります。

</details>

## 確認クイズ

### Q1. `app.js` に書いたJavaScriptを実行するコマンドはどれですか。

- A. `node app.js`
- B. `npm app.js`
- C. `run app.js`

<details>
<summary>答え</summary>

**A** — `node` がコマンド名、ファイル名が引数です。

</details>

### Q2. REPLの説明として正しいものはどれですか。

- A. スクリプトファイルをまとめて実行する機能
- B. 1行ずつ入力して結果をその場で確かめられる対話画面
- C. エラーを自動で修正する機能

<details>
<summary>答え</summary>

**B** — `node` とだけ打つと開きます。書いたものは残らないので、残したい処理はファイルに書きます。

</details>

### Q3. REPLを終了する方法はどれですか。

- A. `exit()` と入力する
- B. `.exit` と入力する(または Ctrl+C を2回)
- C. ターミナルの窓を閉じるしかない

<details>
<summary>答え</summary>

**B** — `.exit` で抜けられます。窓を閉じる必要はありません。

</details>

### Q4. `console.log` の出力先はどこですか。

- A. 標準出力。パイプやリダイレクトで行き先を変えられる
- B. 画面だけ。行き先は変えられない
- C. 標準エラー出力

<details>
<summary>答え</summary>

**A** — 標準出力に書き出すので、`>` でファイルに残したり `|` で次のコマンドに渡したりできます。

</details>

### Q5. エラーが出たときにまず読むべき3点の組み合わせはどれですか。

- A. 種類・メッセージ・発生したファイルと行番号
- B. 実行時間・メモリ使用量・プロセス番号
- C. Node.jsの版・npmの版・OSの種類

<details>
<summary>答え</summary>

**A** — この3点で多くのエラーは自力で直せます。`at ...` の経路(スタックトレース)は後回しで構いません。

</details>
