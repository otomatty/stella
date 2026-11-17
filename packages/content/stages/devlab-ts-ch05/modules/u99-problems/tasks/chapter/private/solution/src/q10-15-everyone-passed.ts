// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問15
export function everyonePassed(students: readonly Student[], border: number): boolean {
  return students.every((s) => s.score >= border);
}
