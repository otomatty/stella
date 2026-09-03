# レッスン6-1 演習 — HTTPサーバーを立てる

対象トピック: 6-1-1 〜 6-1-4

## 手元で試す

準備をします。

```bash
mkdir -p ~/node-practice/server && cd ~/node-practice/server
npm init -y && npm pkg set type=module
```

最小のサーバーを立てます。

```bash
cat > server.js <<'JS'
import { createServer } from "node:http";

const server = createServer((req, res) => {
  console.log(req.method, req.url);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("こんにちは");
});

server.listen(3000);
console.log("http://localhost:3000 で待機中");
JS

node server.js
```

**別のターミナル** を開いて、アクセスしてみてください。

```bash
curl http://localhost:3000
curl http://localhost:3000/about
```

サーバー側のターミナルに、リクエストの記録が出ることを確認します。確認できたら `Ctrl+C` で止めてください。

次に、URLで応答を分けます。

```bash
cat > server.js <<'JS'
import { createServer } from "node:http";

const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  if (req.url === "/") {
    res.end("トップページ");
  } else if (req.url === "/about") {
    res.end("このサイトについて");
  } else {
    res.statusCode = 404;
    res.end("見つかりません");
  }
});

server.listen(3000);
JS

node server.js
```

別のターミナルから、3つのURLを試します。

```bash
curl http://localhost:3000/
curl http://localhost:3000/about
curl -i http://localhost:3000/nothing    # -i でステータス行も表示される
```

最後に、止め忘れの状態を体験します。サーバーを起動したまま、別のターミナルでもう一度起動してください。

```bash
node server.js
# => Error: listen EADDRINUSE: address already in use :::3000

ps aux | grep node
kill <表示されたPID>
```

## 演習問題

### 問1(基本)

`node:http` で3000番ポートを開くために呼ぶ2つの関数(メソッド)は何ですか。

### 問2(基本)

`createServer((req, res) => { ... })` の `req` と `res` の役割をそれぞれ1文で説明してください。

### 問3(応用)

存在しないURLにアクセスされたとき、200ではなく404を返すべき理由を説明してください。

### 問4(応用)

サーバーを起動したまま `node server.js` をもう一度実行したら `EADDRINUSE` と出ました。原因と対処の手順を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`createServer` と `listen` です。

`createServer` でリクエストの受け口を作り、`listen(3000)` でポートを開いて待ち受けを始めます。

</details>

<details>
<summary>問2の解答例</summary>

- `req`(リクエスト): 相手からの要求の情報が入っています。どのURLへ、どの方法で来たかを読み取れます。
- `res`(レスポンス): こちらが返す応答を書き込む相手です。最後に `res.end()` で応答を終えます。

</details>

<details>
<summary>問3の解答例</summary>

呼び出す側が「成功したが中身が空」なのか「URLが間違っている」のかを区別できなくなるためです。

ステータスコードは結果の種類を伝える約束事なので、該当が無いときは404を返します。

</details>

<details>
<summary>問4の解答例</summary>

- 原因: 前に起動したサーバーが残っていて、3000番ポートを握っているためです。
- 対処: `ps aux | grep node` でPIDを調べ、`kill <PID>` で止め、もう一度 `ps aux | grep node` で消えたことを確かめます。

</details>

## 確認クイズ

### Q1. `server.listen(3000)` の3000は何を指していますか。

- A. 待ち受けるポート番号
- B. 同時に処理できるリクエストの数
- C. タイムアウトまでのミリ秒

<details>
<summary>答え</summary>

**A** — ポート番号です。ブラウザからは `http://localhost:3000` でアクセスします。

</details>

### Q2. サーバーを起動するとプログラムが終わりません。この状態の説明として正しいものはどれですか。

- A. 異常。どこかで処理が止まっている
- B. 正常。要求を待ち受け続けるのがサーバーの仕事
- C. 正常だが、しばらくすると自動で終了する

<details>
<summary>答え</summary>

**B** — 待ち続けるのがサーバーです。止めるときは `Ctrl+C` を押します。

</details>

### Q3. `res.end()` を呼ばないとどうなりますか。

- A. 相手が応答を待ち続ける
- B. 自動的に200が返る
- C. サーバーが停止する

<details>
<summary>答え</summary>

**A** — 応答は `res.end()` で終えます。呼ばないと相手は待ち続けます。

</details>

### Q4. 存在しないURLに対して返すべきステータスコードはどれですか。

- A. 200
- B. 404
- C. 500

<details>
<summary>答え</summary>

**B** — 404が「見つからない」です。200は成功、500はサーバー側のエラーを表します。

</details>

### Q5. `EADDRINUSE` というエラーの意味はどれですか。

- A. そのポートは既に使われている
- B. アドレスの書式が間違っている
- C. ネットワークに接続できない

<details>
<summary>答え</summary>

**A** — 前に起動したプロセスがポートを握っています。`ps` で調べて `kill` で止めます。

</details>
