// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問3
export function pageCount(total: number, perPage = 10): number {
  return Math.ceil(total / perPage);
}
