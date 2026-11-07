// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問8
export function totalScore(scores: Map<string, number>): number {
  let total = 0;
  for (const score of scores.values()) {
    total += score;
  }
  return total;
}
