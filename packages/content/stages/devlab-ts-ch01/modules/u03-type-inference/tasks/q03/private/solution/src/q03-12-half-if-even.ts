// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference

// 問12
export function halfIfEven(n: number) {
  if (n % 2 === 0) {
    return n / 2;
  }
  return undefined;
}
