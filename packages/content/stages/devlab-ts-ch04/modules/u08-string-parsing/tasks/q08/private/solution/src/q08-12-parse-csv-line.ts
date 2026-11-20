// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問12
export function parseCsvLine(text: string): string[] {
  return text.split(",").map((part) => part.trim());
}
