// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問15
export function bitOf(flag: boolean): 0 | 1 {
  return flag ? 1 : 0;
}
