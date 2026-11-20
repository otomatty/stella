// 05-q09 型ガード関数とアサーション関数
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions
//
// 問題
// 戻り値の型を value is User のように書くと、true を返したとき、呼び出し側で value が User に絞り込まれる（型ガード関数）。
// asserts value is User と書くと、例外を投げずに戻ったとき、value が User に絞り込まれる（アサーション関数）。
// 型 User は定義済みです。
//
// 1. isString(value)
//    文字列なら true。戻り値の型は value is string
//
// 2. isUser(value)
//    null でないオブジェクトで、name が文字列、age が数値なら true。戻り値の型は value is User
//
// 3. isUserArray(value)
//    配列で、すべての要素が isUser を満たせば true。戻り値の型は value is User[]
//
// 4. assertIsUser(value)
//    User でなければ "User ではありません" の Error を投げる。戻り値の型は asserts value is User
//
// 5. parseUsers(json)
//    JSON の文字列を読み、User の配列なら返す。そうでなければ "User の配列ではありません" の Error を投げる。
//    JSON.parse の結果は any なので、いったん unknown の変数に入れてから isUserArray で確かめる

export type User = { name: string; age: number };

export function isString() {}

export function isUser() {}

export function isUserArray() {}

export function assertIsUser() {}

export function parseUsers() {}
