// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問2
export function signOf(n: number): -1 | 0 | 1 {
  if (n > 0) {
    return 1;
  }
  if (n < 0) {
    return -1;
  }
  return 0;
}
