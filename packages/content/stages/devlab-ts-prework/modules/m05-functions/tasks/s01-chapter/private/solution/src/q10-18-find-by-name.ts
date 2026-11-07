// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問18
export function findByName(students: readonly Student[], name: string): Student | undefined {
  return students.find((s) => s.name === name);
}
