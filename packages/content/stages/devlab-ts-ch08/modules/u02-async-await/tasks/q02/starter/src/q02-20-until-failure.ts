// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async と await を使って書いてください。型 User と、関数 fetchUser、wait は定義済みです。
// fetchUser(id) は id のユーザーを取得します（いない id なら "ユーザー 9 はいません" の Error で失敗する）。
// 戻り値の型は Promise<number> のように書く。async 関数の中では、Promise の結果を await で受け取る。
// 失敗を受け止めるときは try・catch を使う。try の中で Promise を return するときは return await と書く。

// 問20 tasks を前から順番に呼び、失敗したらそこで止めて、それまでに成功した結果の配列を返す（失敗は投げない）
//     例: untilFailure([a, 失敗する task, c]) → ["a"] で解決し、c は呼ばない
export function untilFailure() {}
