// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問17
export type Credentials = Pick<User, "email" | "password">;

export function login(
  users: readonly User[],
  credentials: Credentials,
): Omit<User, "password"> | undefined {
  const user = users.find(
    (u) => u.email === credentials.email && u.password === credentials.password,
  );
  if (user === undefined) {
    return undefined;
  }
  return { id: user.id, name: user.name, email: user.email, age: user.age };
}
