// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問16
export function totalScore(students: readonly Student[]): number {
  let total = 0;
  for (const s of students) {
    total += s.score;
  }
  return total;
}
