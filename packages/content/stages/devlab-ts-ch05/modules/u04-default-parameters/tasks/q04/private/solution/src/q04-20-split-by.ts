// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問20
export function splitBy(text: string, separator = ","): string[] {
  return text.split(separator);
}
