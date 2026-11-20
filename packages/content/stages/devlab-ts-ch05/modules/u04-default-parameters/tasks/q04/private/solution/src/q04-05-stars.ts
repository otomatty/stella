// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問5
export function stars(char = "*", times = 3): string {
  return char.repeat(times);
}
