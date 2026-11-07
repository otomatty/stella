// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問2
export function fixed(n: number, digits?: number): string {
  return n.toFixed(digits ?? 0);
}
