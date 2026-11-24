// 問13 unknown の配列の中で、User の形をしたものの数を返す（型ガード関数を自分で書いて使う）
//     例: countUsers([{ name: "山田", age: 30 }, "x"]) → 1
// 定義済みの User 型を使い、型ガード関数の戻り値の型は value is User と書いてください。

export type User = { name: string; age: number };

export function countUsers() {}
