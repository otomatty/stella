// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問18
export function withFinally(fn: () => number, log: string[]): number {
  try {
    return fn();
  } finally {
    log.push("終了");
  }
}
