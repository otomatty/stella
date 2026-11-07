// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問2
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラー";
}
