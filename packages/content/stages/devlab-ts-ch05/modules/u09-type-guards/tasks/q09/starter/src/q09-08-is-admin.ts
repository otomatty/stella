// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions
//
// 型 User、Admin、Pet は定義済みです。
// 「型ガード関数」は戻り値の型を value is string のように書く。true を返したとき、呼び出し側で value がその型に絞り込まれる。
// 「アサーション関数」は戻り値の型を asserts value is string のように書き、条件に合わなければ例外を投げる。
// テストは、戻り値の型が型ガードやアサーションになっているかも確かめる。

export type User = { name: string; age: number };

export type Admin = User & { role: "admin" };

// 問8 【型ガード】User | Admin を受け取り、Admin か（"role" in user で確かめる）。戻り値の型は user is Admin
//     例: isAdmin({ name: "山田", age: 30, role: "admin" }) → true
export function isAdmin() {}
