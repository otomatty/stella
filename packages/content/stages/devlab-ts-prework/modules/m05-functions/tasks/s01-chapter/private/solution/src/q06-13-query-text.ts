// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問13
export function queryText({ q, limit = 10 }: { q: string; limit?: number }): string {
  return `q=${q}&limit=${limit}`;
}
