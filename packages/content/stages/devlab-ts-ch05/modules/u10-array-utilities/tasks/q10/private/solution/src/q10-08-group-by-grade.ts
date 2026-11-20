// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問8
export function groupByGrade(students: readonly Student[]): { [grade: string]: Student[] } {
  const groups: { [grade: string]: Student[] } = {};
  for (const s of students) {
    const key = String(s.grade);
    groups[key] = [...(groups[key] ?? []), s];
  }
  return groups;
}
