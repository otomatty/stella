// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問9
export function countByGrade(students: readonly Student[]): { [grade: string]: number } {
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
