// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問19
export function tryParseInt(
  text: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!/^-?\d+$/.test(text)) {
    return { ok: false, error: `整数ではありません: ${text}` };
  }
  return { ok: true, value: Number(text) };
}
