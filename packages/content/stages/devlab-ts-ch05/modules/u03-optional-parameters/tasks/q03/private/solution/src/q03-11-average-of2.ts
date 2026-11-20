// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問11
export function averageOf2(a: number, b?: number): number {
  return b === undefined ? a : (a + b) / 2;
}
