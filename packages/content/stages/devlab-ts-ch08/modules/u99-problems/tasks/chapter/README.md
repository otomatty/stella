# 08章 非同期処理の問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | Promise | 20 問 | 応用問題 |
| q02 | async と await | 20 問 | 応用問題 |
| q03 | fetch | 20 問 | 応用問題 |
| q04 | 非同期のエラー処理 | 20 問 | 応用問題 |
| q05 | 複数のAPIの結果をまとめる | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 Promise

次の20問を、async と await を使わずに書いてください（async/await は q02 で扱う）。

使うのは new Promise、then・catch・finally、Promise.resolve・Promise.reject・Promise.all・Promise.race・Promise.allSettled です。

引数と戻り値には型注釈を付けること。戻り値の型は Promise<number> のように、Promise の中身の型まで書く。

失敗させるときは、文字列ではなく Error を使う（Promise.reject(new Error("…"))、throw new Error("…")）。

### q02 async と await

次の20問を、async と await を使って書いてください。型 User と、関数 fetchUser、wait は定義済みです。

fetchUser(id) は id のユーザーを取得します（いない id なら "ユーザー 9 はいません" の Error で失敗する）。

戻り値の型は Promise<number> のように書く。async 関数の中では、Promise の結果を await で受け取る。

失敗を受け止めるときは try・catch を使う。try の中で Promise を return するときは return await と書く。

export type User = { id: number; name: string; age: number };

const USERS: User[] = [

{ id: 1, name: "山田", age: 34 },

{ id: 2, name: "佐藤", age: 19 },

{ id: 3, name: "鈴木", age: 52 },

{ id: 4, name: "田中", age: 20 },

];

id のユーザーを取得する。いなければ失敗する

export function fetchUser(id: number): Promise<User> {

const user = USERS.find((u) => u.id === id);

return user === undefined

? Promise.reject(new Error(`ユーザー ${id} はいません`))

: Promise.resolve(user);

}

ms ミリ秒待つ

export function wait(ms: number): Promise<void> {

return new Promise((resolve) => {

setTimeout(resolve, ms);

});

}

### q03 fetch

次の20問を、fetch と async・await を使って書いてください。定数 API、型 User・Todo、型ガード関数 isUser・isTodo は定義済みです。

テストでは fetch を差し替えて、本物の通信はしません。fetch に渡した URL や設定（2つ目の引数）もテストで確かめます。

res.json() の戻り値は any なので、const data: unknown = await res.json(); のように unknown の変数に入れてから確かめて使う。

「`HTTP 404` の Error」は、数字の部分を res.status にした Error のこと。

export const API = "https://api.example.com";

export type User = { id: number; name: string };

export type Todo = { id: number; title: string; done: boolean };

export function isUser(value: unknown): value is User {

return (

typeof value === "object" &&

value !== null &&

"id" in value &&

typeof value.id === "number" &&

"name" in value &&

typeof value.name === "string"

);

}

export function isTodo(value: unknown): value is Todo {

return (

typeof value === "object" &&

value !== null &&

"id" in value &&

typeof value.id === "number" &&

"title" in value &&

typeof value.title === "string" &&

"done" in value &&

typeof value.done === "boolean"

);

}

### q04 非同期のエラー処理

次の20問を、async・await と try・catch・finally を使って書いてください。型 Task・Result・ApiResult と関数 wait は定義済みです。

Task は「呼ぶたびに処理を始め、数値で解決するか失敗する関数」です。呼んだ回数だけ処理が走ります。

catch で受け取る値の型は unknown です。message を使うときは、error instanceof Error で確かめてから使う。

try の中で Promise を return するときは return await と書く（await がないと、その失敗は catch で捕まえられない）。

export type Task = () => Promise<number>;

export type Result = { ok: true; value: number } | { ok: false; message: string };

export type ApiResult = { ok: boolean; status: number };

ms ミリ秒待つ

export function wait(ms: number): Promise<void> {

return new Promise((resolve) => {

setTimeout(resolve, ms);

});

}

### q05 複数のAPIの結果をまとめる

次の20問を、async・await と Promise.all・Promise.allSettled を使って書いてください。

型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。

getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。

待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。

export type User = { id: number; name: string };

export type Post = { id: number; userId: number; title: string };

export type Comment = { postId: number; text: string };

const USERS: User[] = [

{ id: 1, name: "山田" },

{ id: 2, name: "佐藤" },

{ id: 3, name: "鈴木" },

{ id: 4, name: "田中" },

];

const POSTS: Post[] = [

{ id: 10, userId: 1, title: "TypeScript を始めました" },

{ id: 11, userId: 1, title: "型注釈のこつ" },

{ id: 12, userId: 2, title: "非同期処理のまとめ" },

{ id: 13, userId: 1, title: "ジェネリクスに挑戦" },

];

const COMMENTS: Comment[] = [

{ postId: 10, text: "いいですね" },

{ postId: 10, text: "参考になりました" },

{ postId: 12, text: "わかりやすい" },

{ postId: 13, text: "難しそう" },

];

id のユーザーを取得する。いなければ失敗する

export function getUser(id: number): Promise<User> {

const user = USERS.find((u) => u.id === id);

return user === undefined

? Promise.reject(new Error(`ユーザー ${id} はいません`))

: Promise.resolve(user);

}

ユーザーの投稿を取得する。userId が 3 なら失敗する

export function getPosts(userId: number): Promise<Post[]> {

return userId === 3

? Promise.reject(new Error("投稿を取得できません"))

: Promise.resolve(POSTS.filter((p) => p.userId === userId));

}

投稿のコメントを取得する

export function getComments(postId: number): Promise<Comment[]> {

return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));

}

## 進め方

1 問確認して提出し、次の問題へ進みます。

確認と提出は、VS Code 拡張（「STELLA: 課題を確認する」と課題のパネル）か、CLI の `stella check` と `stella submit` でできます。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-add-tax.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-let-const.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: Promise (asynchronous)](https://typescriptbook.jp/reference/asynchronous)
- [サバイバルTypeScript: Promise (promise)](https://typescriptbook.jp/reference/asynchronous/promise)
- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
