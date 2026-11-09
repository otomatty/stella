// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問2
export function averageScore(students: readonly Student[]): number {
  if (students.length === 0) {
    return 0;
  }
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total / students.length;
}
