// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問14
export function mergeAdd(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const result = new Map(a);
  for (const [key, value] of b) {
    result.set(key, (result.get(key) ?? 0) + value);
  }
  return result;
}
