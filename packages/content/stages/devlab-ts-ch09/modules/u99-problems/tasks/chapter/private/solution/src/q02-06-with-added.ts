// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問6
export function withAdded(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  result.add(value);
  return result;
}
