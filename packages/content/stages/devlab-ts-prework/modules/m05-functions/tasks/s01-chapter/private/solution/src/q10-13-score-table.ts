// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問13
export function scoreTable(students: readonly Student[]): { [name: string]: number } {
  const table: { [name: string]: number } = {};
  for (const s of students) {
    table[s.name] = s.score;
  }
  return table;
}
