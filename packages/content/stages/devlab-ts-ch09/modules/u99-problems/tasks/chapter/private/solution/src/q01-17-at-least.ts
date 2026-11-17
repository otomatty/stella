// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問17
export function atLeast(scores: Map<string, number>, min: number): Map<string, number> {
  return new Map([...scores].filter(([, score]) => score >= min));
}
