// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問12
export function groupByInitial(words: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const initial = word.slice(0, 1);
    const group = groups.get(initial);
    if (group === undefined) {
      groups.set(initial, [word]);
    } else {
      group.push(word);
    }
  }
  return groups;
}
