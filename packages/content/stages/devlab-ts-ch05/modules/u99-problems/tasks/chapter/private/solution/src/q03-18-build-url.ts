// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問18
export function buildUrl(path: string, query?: string): string {
  return query === undefined ? path : `${path}?${query}`;
}
