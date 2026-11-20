// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問13
export function invert(map: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of map) {
    result.set(value, key);
  }
  return result;
}
