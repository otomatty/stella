// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems

// 問8
export function power(base: number, exponent: number): number {
  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
}
