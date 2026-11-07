// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問3
export function parseIntStrict(text: string): number {
  if (!/^-?\d+$/.test(text)) {
    throw new Error(`整数ではありません: ${text}`);
  }
  return Number(text);
}
