// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問13
export function safeUsers(users: readonly User[]): Omit<User, "password">[] {
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, age: u.age }));
}
