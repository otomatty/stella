// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問10
export function averageByGrade(students: readonly Student[]): { [grade: string]: number } {
  const totals: { [grade: string]: number } = {};
  const counts: { [grade: string]: number } = {};
  for (const s of students) {
    const key = String(s.grade);
    totals[key] = (totals[key] ?? 0) + s.score;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const result: { [grade: string]: number } = {};
  for (const [key, total] of Object.entries(totals)) {
    result[key] = Math.round((total / (counts[key] ?? 1)) * 10) / 10;
  }
  return result;
}
