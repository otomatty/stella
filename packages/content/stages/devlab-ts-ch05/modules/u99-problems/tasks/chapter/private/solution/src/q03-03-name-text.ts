// 05-q03 オプション引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/optional-parameters

// 問3
export function nameText(last: string, first?: string): string {
  return first === undefined ? last : `${last} ${first}`;
}
