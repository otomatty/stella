// 問13 User の配列から、password を除いた配列を返す
//     例: safeUsers(users) → password のない User の配列
// 引数と戻り値に型注釈を付けます。
// 戻り値の配列の要素の型に Omit<User, "password"> を使います。

export type User = { id: number; name: string; email: string; password: string; age: number };

export function safeUsers() {}
