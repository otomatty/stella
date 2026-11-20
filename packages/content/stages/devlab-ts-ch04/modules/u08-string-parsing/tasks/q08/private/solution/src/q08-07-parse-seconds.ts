// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問7
export function parseSeconds(text: string): number {
  const unit = text.slice(-1);
  const value = Number(text.slice(0, -1));
  if (text.length < 2 || !Number.isFinite(value)) {
    throw new Error(`時間ではありません: ${text}`);
  }
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    default:
      throw new Error(`時間ではありません: ${text}`);
  }
}
