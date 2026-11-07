// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference

// 問8
export function sign(n: number) {
  if (n > 0) {
    return "plus";
  }
  if (n < 0) {
    return "minus";
  }
  return "zero";
}
