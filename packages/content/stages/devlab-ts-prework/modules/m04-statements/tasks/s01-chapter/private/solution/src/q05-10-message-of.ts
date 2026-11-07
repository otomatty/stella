// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問10
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
