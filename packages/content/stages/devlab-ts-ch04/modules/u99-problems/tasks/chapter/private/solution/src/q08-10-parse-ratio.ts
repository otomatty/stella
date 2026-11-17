// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問10
export function parseRatio(text: string): number {
  const value = Number(text.slice(0, -1));
  if (!text.endsWith("%") || text.length < 2 || !Number.isFinite(value)) {
    throw new Error(`割合ではありません: ${text}`);
  }
  return value / 100;
}
