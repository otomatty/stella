# レッスン5-1 外から来る値を扱う

## このレッスンの目標

- [ ] 型検査が実行時のデータを保証しないことを説明できる
- [ ] `unknown` で受けて、確認してから使える
- [ ] 確認を境界の1か所にまとめられる

## 5-1-1 外から来る値には型が付いていない

> **JSON.parseの結果は中身が保証されないので、そのまま信用してはいけない**

型を書いたのに実行時に落ちた、という経験をすると、型への信頼が揺らぎます。ここで型の限界をはっきりさせておきます。

- **JSON** — 設定や通信でよく使われる、データの書き方
- **any** — どんな値でもよいという型。以降の検査が効かなくなる

```ts
type User = { id: number; name: string };

const text = await readFile("user.json", "utf-8");
const user = JSON.parse(text) as User;   // 中身は確かめていない

console.log(user.name.length);   // ファイルが空なら実行時に落ちる
```

**型検査は実行前、データが来るのは実行時** です。TypeScriptはファイルの中身を見ていません。だから、ファイルやネットワークから来た値は、型を書いただけでは保証されません。

`as User` は「User だと思って扱う」という宣言であって、検査ではありません。書いた人の思い込みをそのまま通してしまうので、外から来た値に対して安易に使うのは危険です。

## 5-1-2 unknownは確認してからしか使えない

> **unknownで受けると、確認を通すまで値を使えないので、確認漏れを防げる**

`any` にすれば書けてしまいますが、その先の検査が全部効かなくなります。かといって、外から来た値に確かな型は付けられません。

**unknown** は、何が入っているか分からない値を表す型です。

```ts
const a: any = JSON.parse(text);
a.name.length;          // 検査されない。実行時に落ちる

const u: unknown = JSON.parse(text);
u.name;                 // エラー: 確認していない

if (typeof u === "object" && u !== null && "name" in u) {
  // ここでは name があると分かっている
}
```

`any` と `unknown` は、どちらも「何でも入る」型です。違うのは **出口** です。

| 型 | 入れるとき | 使うとき |
|---|---|---|
| `any` | 何でも入る | 何でもできる(検査されない) |
| `unknown` | 何でも入る | **確認を通すまで何もできない** |

外から来た値には `unknown` を使う、と覚えてください。確認の書き方は少し長くなりますが、確認漏れが型検査で止まることの価値の方が大きいです(実務では、この確認を担うライブラリを使うこともあります)。

## 5-1-3 catchで受け取る値もunknown

> **catchの引数はunknownなので、メッセージを読む前に種類を確認する**

Node.js入門で書いた `try-catch` を型付きで書くと、`catch (error)` の中で `error.message` と書いた行がエラーになります。

理由は、**投げられるものが Error とは限らない** からです。JavaScriptでは文字列でも数値でも投げられるため、`catch` の引数の型は `unknown` になっています。

**Error** は、失敗の情報を持つ標準の型で、`message` を持っています。

```ts
try {
  await readFile("memo.txt", "utf-8");
} catch (error) {
  if (error instanceof Error) {
    console.error("読めません: " + error.message);
  } else {
    console.error("読めません(詳細不明)");
  }
}
```

`instanceof Error` で確認を通すと、その中では `Error` として扱えます。前のレッスンで見た「確認を通すと型が絞られる」動きと同じです。

## 5-1-4 確認は境界の1か所に置く

> **外から来た値は入口で1度だけ確認し、そこから先は型を信じて書く**

確認が大事だと分かると、今度はあちこちに確認を書きたくなります。しかし、すべての関数で `undefined` を確認していては、コードが確認だらけになって読めません。

**境界** は、外の世界と自分のコードが接する場所です。ファイル、ネットワーク、環境変数、コマンドライン引数がこれに当たります。

```ts
// 境界: 確認する
function toUser(value: unknown): User {
  // 形を確かめて、User として返す(確認できなければ例外を投げる)
}

// 内側: 型を信じてよい
function greet(user: User): string {
  return user.name + " さん";
}
```

`toUser` を通った時点で、値は `User` だと保証されます。だから `greet` は確認をせず、処理そのものに集中して書けます。

**外は疑い、内は信じる**。この線引きができると、型を書く効果が最大になります。境界での確認は、後続の研修(REST API 入門)で扱うリクエストの検証にもそのまま続く考え方です。

## 5-1-5 環境変数は関数を通して読む

> **環境変数は読み取り用の関数を1つ作り、無いときの扱いをそこにまとめる**

`process.env.PORT` を使うたびに `undefined` の確認を書いていると、書き方が場所によって違ってきますし、抜けも生まれます。境界を関数にまとめましょう。

**設定** は、環境ごとに変わる値のことです。接続先やポート番号が代表です。

```ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error("環境変数 " + name + " が未設定です");
  }
  return value;                       // ここから先は string
}

const apiUrl: string = requireEnv("API_URL");
```

この関数の戻り値の型は `string` です。`string | undefined` ではありません。無いときは例外を投げて処理を止めるので、**返ってきた時点で値があることが保証されている** からです。

呼び出し側は確認をしません。境界の中に確認が閉じ込められているためです。しかも、未設定のときのメッセージが1か所に書かれているので、「環境変数 API_URL が未設定です」と原因が明確に伝わります。

この講座で学んだこと(型注釈・関数の型・オブジェクトの型・境界での確認)は、次のHTTPとREST API入門でそのまま使います。

## もっと知りたい人へ

- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — 確認による型の絞り込み
- [MDN — JSON](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/JSON) — JSONの仕様

---

演習は [practice.md](practice.md) にあります。
