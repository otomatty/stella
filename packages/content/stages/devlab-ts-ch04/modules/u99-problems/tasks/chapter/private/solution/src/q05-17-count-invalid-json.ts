// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問17
export function countInvalidJson(texts: readonly string[]): number {
  let count = 0;
  for (const text of texts) {
    try {
      JSON.parse(text);
    } catch {
      count++;
    }
  }
  return count;
}
