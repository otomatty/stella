// 問7 【型ガード】null でないオブジェクトで、name が文字列、age が数値か。戻り値の型は value is User
//     例: isUser({ name: "山田", age: 30 }) → true
// ファイル内に定義済みの User 型を使ってください。

export type User = { name: string; age: number };

export function isUser() {}
