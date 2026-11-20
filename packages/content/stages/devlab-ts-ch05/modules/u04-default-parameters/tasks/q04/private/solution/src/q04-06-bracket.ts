// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問6
export function bracket(text: string, left = "[", right = "]"): string {
  return `${left}${text}${right}`;
}
