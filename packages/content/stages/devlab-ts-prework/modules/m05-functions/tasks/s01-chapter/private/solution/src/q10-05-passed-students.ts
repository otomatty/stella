// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問5
export function passedStudents(students: readonly Student[], border: number): Student[] {
  return students.filter((s) => s.score >= border);
}
