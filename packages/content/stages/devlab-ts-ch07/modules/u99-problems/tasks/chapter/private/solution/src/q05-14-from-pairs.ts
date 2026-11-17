// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問14
export function fromPairs(pairs: readonly [string, number][]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of pairs) {
    result[key] = value;
  }
  return result;
}
