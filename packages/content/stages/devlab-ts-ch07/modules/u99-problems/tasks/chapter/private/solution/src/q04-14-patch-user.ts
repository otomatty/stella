// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit

export type User = { id: number; name: string; email: string; password: string; age: number };

// 問14
export type UserPatch = Partial<Pick<User, "name" | "email" | "age">>;

export function patchUser(user: User, patch: UserPatch): User {
  return { ...user, ...patch };
}
