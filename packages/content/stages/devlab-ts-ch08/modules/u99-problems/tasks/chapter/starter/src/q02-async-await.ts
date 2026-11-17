// 08-q02 async と await
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await
//
// 問題
// ユーザーを1人取得する非同期関数 fetchUser（型は FetchUser）を引数で受け取り、次の関数を書いてください。
// async と await を使うこと。戻り値の型は Promise<…> で書く。
//
// 1. getUserName(fetchUser, id)
//    ユーザーを取得して、名前を返す
//
// 2. getUsersInOrder(fetchUser, ids)
//    ids のユーザーを1人ずつ順番に取得する（for...of と await）。
//    前のユーザーの取得が終わってから、次のユーザーの取得を始めること。戻り値は ids の順のユーザーの配列
//
// 3. getUsersAtOnce(fetchUser, ids)
//    ids のユーザーの取得を一度に始めて、Promise.all ですべてを待つ。戻り値は ids の順のユーザーの配列
//
// 4. getNamesText(fetchUser, ids)
//    getUsersAtOnce を使って取得し、名前を「、」でつないだ文字列を返す。ids が空なら ""
//
// 説明すること（答えは、この下に // のコメントで書く）
// - ids が10件で、1件の取得に1秒かかるとき、getUsersInOrder と getUsersAtOnce はそれぞれ何秒かかるか。
//   順番に取得しなければならないのは、どんなときか

export type User = { id: number; name: string };
export type FetchUser = (id: number) => Promise<User>;

export function getUserName() {}

export function getUsersInOrder() {}

export function getUsersAtOnce() {}

export function getNamesText() {}
