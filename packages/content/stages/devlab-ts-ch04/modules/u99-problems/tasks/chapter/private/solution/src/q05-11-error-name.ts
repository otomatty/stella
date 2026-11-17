// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception

// 問11
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Unknown";
}
