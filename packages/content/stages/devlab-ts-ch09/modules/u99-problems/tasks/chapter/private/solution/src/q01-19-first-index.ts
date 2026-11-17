// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map

// 問19
export function firstIndex(words: readonly string[]): Map<string, number> {
  const result = new Map<string, number>();
  words.forEach((word, i) => {
    if (!result.has(word)) {
      result.set(word, i);
    }
  });
  return result;
}
