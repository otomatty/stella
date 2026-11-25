// 問7 User から { name, email } を取り出して返す。戻り値は Pick<User, "name" | "email">
//     例: toContact(user) → { name: "山田", email: "y@example.com" }
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

export function toContact(user: User): Pick<User, "name" | "email"> {
  return { name: user.name, email: user.email };
}
