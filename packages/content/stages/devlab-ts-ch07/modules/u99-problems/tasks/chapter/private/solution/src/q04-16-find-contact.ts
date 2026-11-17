// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問16
export function findContact(
  users: readonly User[],
  id: number,
): Pick<User, "name" | "email"> | undefined {
  const user = users.find((u) => u.id === id);
  return user === undefined ? undefined : { name: user.name, email: user.email };
}
