export function wordCount(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of text.split(/\s+/)) {
    if (word === "") {
      continue;
    }
    const key = word.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function topWords(counts: ReadonlyMap<string, number>, n: number): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function mergeCounts(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): Map<string, number> {
  const merged = new Map(a);
  for (const [word, count] of b) {
    merged.set(word, (merged.get(word) ?? 0) + count);
  }
  return merged;
}

export function groupByLength(words: readonly string[]): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const word of words) {
    const group = groups.get(word.length);
    if (group === undefined) {
      groups.set(word.length, [word]);
    } else {
      group.push(word);
    }
  }
  return groups;
}
