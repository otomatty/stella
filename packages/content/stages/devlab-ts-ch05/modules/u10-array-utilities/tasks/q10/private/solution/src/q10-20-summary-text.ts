// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問20
export function summaryText(students: readonly Student[]): string {
  let best: Student | undefined;
  let total = 0;
  for (const s of students) {
    total += s.score;
    if (best === undefined || s.score > best.score) {
      best = s;
    }
  }
  if (best === undefined) {
    return "人数 0";
  }
  const average = (total / students.length).toFixed(1);
  return `人数 ${students.length}、平均 ${average}、最高 ${best.name}（${best.score}）`;
}
