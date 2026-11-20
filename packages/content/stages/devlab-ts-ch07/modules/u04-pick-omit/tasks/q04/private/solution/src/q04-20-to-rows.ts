// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問20
export type UserRow = Pick<User, "id" | "name" | "age">;

export function toRows(users: readonly User[]): UserRow[] {
  return users.map((u) => ({ id: u.id, name: u.name, age: u.age })).sort((a, b) => a.id - b.id);
}
