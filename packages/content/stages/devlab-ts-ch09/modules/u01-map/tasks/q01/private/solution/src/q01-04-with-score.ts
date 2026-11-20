// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問4
export function withScore(
  scores: Map<string, number>,
  name: string,
  score: number,
): Map<string, number> {
  const result = new Map(scores);
  result.set(name, score);
  return result;
}
