// 問12 文字列が User のプロパティ名なら true。戻り値の型は text is keyof User
//     例: isUserKey("email") → true
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; age: number };

const USER_KEYS: readonly (keyof User)[] = ["id", "name", "email", "age"];

export function isUserKey(text: string): text is keyof User {
  return USER_KEYS.some((key) => key === text);
}
