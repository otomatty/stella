// 問7 user の key のプロパティを返す。key の型は keyof User、戻り値は string | number
//     例: userField(user, "name") → "山田"
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; age: number };

export function userField(user: User, key: keyof User): string | number {
  return user[key];
}
