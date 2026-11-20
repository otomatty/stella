# 08章 q02 async と await

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q02 | async と await | 20 問 | 応用問題 |

## 課題の説明

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

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q02-01-get-age.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q02-async-await.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
