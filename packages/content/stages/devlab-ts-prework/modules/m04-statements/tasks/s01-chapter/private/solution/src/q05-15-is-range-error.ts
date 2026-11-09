// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問15
export function isRangeError(error: unknown): boolean {
  return error instanceof RangeError;
}
