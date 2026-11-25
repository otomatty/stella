// 問8 User から password を除いたオブジェクトを返す。戻り値は Omit<User, "password">
//     例: toSafeUser(user) → password のない User
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

export function toSafeUser() {}
