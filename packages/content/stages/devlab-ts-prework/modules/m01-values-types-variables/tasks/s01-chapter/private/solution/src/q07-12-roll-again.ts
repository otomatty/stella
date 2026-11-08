// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問12
export function rollAgain(face: 1 | 2 | 3 | 4 | 5 | 6): boolean {
  return face === 6;
}
