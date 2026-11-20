// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問5
export function withoutName(scores: Map<string, number>, name: string): Map<string, number> {
  const result = new Map(scores);
  result.delete(name);
  return result;
}
