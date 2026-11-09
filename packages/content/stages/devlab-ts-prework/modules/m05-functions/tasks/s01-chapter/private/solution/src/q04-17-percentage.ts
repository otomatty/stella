// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問17
export function percentage(part: number, total = 100): number {
  return Math.round((part / total) * 100);
}
