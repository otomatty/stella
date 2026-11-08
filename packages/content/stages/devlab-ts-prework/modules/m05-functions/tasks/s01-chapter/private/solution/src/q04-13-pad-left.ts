// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問13
export function padLeft(text: string, width = 5, fill = " "): string {
  return text.padStart(width, fill);
}
