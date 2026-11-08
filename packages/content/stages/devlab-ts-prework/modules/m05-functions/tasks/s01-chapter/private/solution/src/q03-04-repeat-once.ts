// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問4
export function repeatOnce(text: string, times?: number): string {
  return text.repeat(times ?? 1);
}
