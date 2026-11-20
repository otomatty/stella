// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations

export type Student = { name: string; grade: number; score: number };

// 問7
export function rankLabels(students: readonly Student[]): string[] {
  return [...students].sort((a, b) => b.score - a.score).map((s, i) => `${i + 1}位 ${s.name}`);
}
