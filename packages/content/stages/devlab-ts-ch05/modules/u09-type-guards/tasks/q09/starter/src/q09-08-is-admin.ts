// 問8 【型ガード】User | Admin を受け取り、Admin か（"role" in user で確かめる）。戻り値の型は user is Admin
//     例: isAdmin({ name: "山田", age: 30, role: "admin" }) → true
// ファイル内に定義済みの User 型と Admin 型を使ってください。

export type User = { name: string; age: number };

export type Admin = User & { role: "admin" };

export function isAdmin() {}
