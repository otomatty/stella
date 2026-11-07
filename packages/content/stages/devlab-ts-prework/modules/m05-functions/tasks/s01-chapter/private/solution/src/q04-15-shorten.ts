// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問15
export function shorten(text: string, max = 5): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
