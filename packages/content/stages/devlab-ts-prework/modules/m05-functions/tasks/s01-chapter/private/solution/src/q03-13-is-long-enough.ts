// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問13
export function isLongEnough(text: string, min?: number): boolean {
  return text.length >= (min ?? 8);
}
