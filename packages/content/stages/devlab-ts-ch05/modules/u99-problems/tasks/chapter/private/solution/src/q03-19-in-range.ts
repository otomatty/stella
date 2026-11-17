// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問19
export function inRange(n: number, min?: number, max?: number): boolean {
  return n >= (min ?? 0) && n <= (max ?? 100);
}
