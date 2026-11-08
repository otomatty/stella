// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問18
export function commandArgs(text: string): string[] {
  const words = text.trim().split(/\s+/);
  return words.slice(1).filter((word) => word !== "");
}
