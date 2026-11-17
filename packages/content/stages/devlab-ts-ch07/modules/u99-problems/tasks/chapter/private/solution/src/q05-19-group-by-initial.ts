// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

// 問19
export function groupByInitial(words: readonly string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const word of words) {
    const key = word.slice(0, 1);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}
