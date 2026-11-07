// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問13
export function valuesOf(user: User, keys: readonly (keyof User)[]): (string | number)[] {
  return keys.map((key) => user[key]);
}
