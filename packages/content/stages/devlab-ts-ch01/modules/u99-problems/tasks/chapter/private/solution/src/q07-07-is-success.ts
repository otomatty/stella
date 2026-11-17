// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問7
export function isSuccess(code: 200 | 404 | 500): boolean {
  return code === 200;
}
