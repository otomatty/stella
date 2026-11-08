// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問7
export function withRemoved(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  result.delete(value);
  return result;
}
