// 問10 Omit<User, "id"> と id から User を作る
//     例: createUser(input, 7).id → 7
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

export function createUser() {}
