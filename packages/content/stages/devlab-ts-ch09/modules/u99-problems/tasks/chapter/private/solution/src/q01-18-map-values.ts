// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問18
export function mapValues(
  scores: Map<string, number>,
  fn: (n: number) => number,
): Map<string, number> {
  return new Map([...scores].map(([key, value]): [string, number] => [key, fn(value)]));
}
