// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問17
export function scoreRange(students: readonly Student[]): [number, number] {
  if (students.length === 0) {
    throw new Error("生徒がいません");
  }
  const scores = students.map((s) => s.score);
  return [Math.min(...scores), Math.max(...scores)];
}
