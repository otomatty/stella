// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問12
const USER_KEYS: readonly (keyof User)[] = ["id", "name", "email", "age"];

export function isUserKey(text: string): text is keyof User {
  return USER_KEYS.some((key) => key === text);
}
