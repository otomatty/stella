// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問15
export function tryOr(fn: () => number, fallback: number): number {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
