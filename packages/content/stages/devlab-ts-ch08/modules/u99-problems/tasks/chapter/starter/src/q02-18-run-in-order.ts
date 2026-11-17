// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async と await を使って書いてください。型 User と、関数 fetchUser、wait は定義済みです。
// fetchUser(id) は id のユーザーを取得します（いない id なら "ユーザー 9 はいません" の Error で失敗する）。
// 戻り値の型は Promise<number> のように書く。async 関数の中では、Promise の結果を await で受け取る。
// 失敗を受け止めるときは try・catch を使う。try の中で Promise を return するときは return await と書く。

// 問18 tasks（Promise を返す関数の配列）を前から1つずつ呼び、前の task が終わってから次を呼ぶ。結果の配列を返す
//     例: runInOrder([a を返す task, b を返す task]) → ["a", "b"] で解決する
export function runInOrder() {}
