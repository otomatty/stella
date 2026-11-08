// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問7
export function padTwo(n: number, width?: number): string {
  return String(n).padStart(width ?? 2, "0");
}
