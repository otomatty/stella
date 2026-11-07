// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問7
export function limit(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}
