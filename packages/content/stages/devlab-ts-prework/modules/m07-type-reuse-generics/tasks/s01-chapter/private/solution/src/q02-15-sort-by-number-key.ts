// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types

export type User = { id: number; name: string; email: string; age: number };

// 問15
export function sortByNumberKey(users: readonly User[], key: "id" | "age"): User[] {
  return [...users].sort((a, b) => a[key] - b[key]);
}
