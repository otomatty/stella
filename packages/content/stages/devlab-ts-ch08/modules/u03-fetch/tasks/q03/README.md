# 08章 q03 fetch

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q03 | fetch | 20 問 | 応用問題 |

## 課題の説明

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

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q03-01-get-status.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q03-fetch.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
