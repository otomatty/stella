// 問13 user の、keys に並べたプロパティの値を、その順に並べた配列を返す。keys は readonly (keyof User)[]
//     例: valuesOf(user, ["name", "age"]) → ["山田", 30]
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; age: number };

export function valuesOf() {}
