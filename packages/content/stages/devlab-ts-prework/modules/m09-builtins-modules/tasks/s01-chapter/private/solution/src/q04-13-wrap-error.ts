// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問13
export function wrapError(error: unknown, message: string): Error {
  return new Error(message, { cause: error });
}
