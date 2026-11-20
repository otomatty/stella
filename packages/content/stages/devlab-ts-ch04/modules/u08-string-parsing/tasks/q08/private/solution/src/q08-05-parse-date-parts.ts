// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問5
export function parseDateParts(text: string): [number, number, number] {
  const parts = text.split("-");
  const [y, m, d] = parts.map(Number);
  if (
    parts.length !== 3 ||
    y === undefined ||
    m === undefined ||
    d === undefined ||
    !Number.isInteger(y) ||
    !Number.isInteger(m) ||
    !Number.isInteger(d)
  ) {
    throw new Error(`日付ではありません: ${text}`);
  }
  return [y, m, d];
}
