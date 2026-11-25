// 問12 文字列が User のプロパティ名なら true。戻り値の型は text is keyof User
//     例: isUserKey("email") → true
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; age: number };

export function isUserKey() {}
