// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問20
export function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
