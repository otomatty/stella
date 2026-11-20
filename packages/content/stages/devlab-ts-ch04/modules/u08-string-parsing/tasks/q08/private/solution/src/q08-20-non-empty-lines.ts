// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問20
export function nonEmptyLines(text: string): string[] {
  const result: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      result.push(trimmed);
    }
  }
  return result;
}
