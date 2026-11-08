// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問2
export function parseNumberList(text: string): number[] {
  const result: number[] = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n)) {
      throw new Error(`数値ではありません: ${trimmed}`);
    }
    result.push(n);
  }
  return result;
}
