// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問12
export function makeOptions(size = "M", color = "black"): { size: string; color: string } {
  return { size, color };
}
