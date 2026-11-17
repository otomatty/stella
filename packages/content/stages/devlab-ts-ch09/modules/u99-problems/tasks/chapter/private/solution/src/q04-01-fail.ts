// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問1
export function fail(message: string): never {
  throw new Error(message);
}
