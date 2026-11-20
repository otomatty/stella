// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問11
export function charCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of text) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return counts;
}
