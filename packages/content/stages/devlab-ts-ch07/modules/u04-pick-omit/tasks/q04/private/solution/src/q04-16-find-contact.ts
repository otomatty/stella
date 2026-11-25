// 問16 id の User を探し、Pick<User, "name" | "email"> を返す。いなければ undefined
//     例: findContact(users, 1) → { name: "山田", email: "y@example.com" }
// 引数と戻り値に型注釈を付けます。

export type User = { id: number; name: string; email: string; password: string; age: number };

export function findContact(
  users: readonly User[],
  id: number,
): Pick<User, "name" | "email"> | undefined {
  const user = users.find((u) => u.id === id);
  return user === undefined ? undefined : { name: user.name, email: user.email };
}
