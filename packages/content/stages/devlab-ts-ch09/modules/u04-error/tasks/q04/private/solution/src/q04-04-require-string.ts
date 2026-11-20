// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問4
export function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("文字列ではありません");
  }
  return value;
}
