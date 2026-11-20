// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問17
export function firstRepeated(items: string[]): string | undefined {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return undefined;
}
