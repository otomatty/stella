// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問8
export function parseRange(text: string): [number, number] {
  const parts = text.split("-");
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (parts.length !== 2 || !Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error(`範囲ではありません: ${text}`);
  }
  return [start, end];
}
