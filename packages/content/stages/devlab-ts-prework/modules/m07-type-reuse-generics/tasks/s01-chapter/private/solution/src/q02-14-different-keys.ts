// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問14
export function differentKeys(a: User, b: User): (keyof User)[] {
  const keys: (keyof User)[] = ["id", "name", "email", "age"];
  return keys.filter((key) => a[key] !== b[key]);
}
