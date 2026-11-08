// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問11
export function afterText(seconds = 1): string {
  return `${seconds}秒後`;
}
