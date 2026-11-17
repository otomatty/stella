// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問6
export function errorKind(error: unknown): string {
  if (error instanceof TypeError) {
    return "TypeError";
  }
  if (error instanceof RangeError) {
    return "RangeError";
  }
  if (error instanceof SyntaxError) {
    return "SyntaxError";
  }
  if (error instanceof Error) {
    return "Error";
  }
  return "unknown";
}
