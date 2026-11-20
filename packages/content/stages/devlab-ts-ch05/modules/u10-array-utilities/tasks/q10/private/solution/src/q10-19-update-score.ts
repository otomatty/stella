// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問19
export function updateScore(students: readonly Student[], name: string, score: number): Student[] {
  return students.map((s) => (s.name === name ? { ...s, score } : s));
}
