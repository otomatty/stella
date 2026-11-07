// 01-q04 number型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/number

// 問8
export function squareRoot(n: number): number {
  if (n < 0) {
    throw new Error("負の数の平方根は求められません");
  }
  return Math.sqrt(n);
}
