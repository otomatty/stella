// 問20 型 UserRow を Pick<User, "id" | "name" | "age"> として作る。toRows(users) で UserRow の配列を id の小さい順に返す
//     例: toRows(users) → [{ id: 1, name: "山田", age: 30 }, …]
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

// ここに型 UserRow と関数 toRows を書く
