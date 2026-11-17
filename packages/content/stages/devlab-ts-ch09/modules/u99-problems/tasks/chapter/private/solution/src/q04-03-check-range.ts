// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問3
export function checkRange(n: number, min: number, max: number): number {
  if (n < min || n > max) {
    throw new RangeError(`${n} は ${min}〜${max} の範囲外です`);
  }
  return n;
}
