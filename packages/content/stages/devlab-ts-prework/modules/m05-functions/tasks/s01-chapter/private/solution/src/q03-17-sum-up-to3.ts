// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問17
export function sumUpTo3(a: number, b?: number, c?: number): number {
  return a + (b ?? 0) + (c ?? 0);
}
