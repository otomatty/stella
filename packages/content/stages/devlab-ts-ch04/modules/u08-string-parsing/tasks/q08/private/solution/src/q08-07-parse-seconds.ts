// 問7 "90s"、"5m"、"2h" を秒にする（s は秒、m は分、h は時間）。それ以外は "時間ではありません: <text>" の Error
//     例: parseSeconds("5m") → 300
// 引数と戻り値に型注釈を付けます。
// 必要な部分を slice で取り出します。
// 数値に変換するには Number、有限の数値かの確認には Number.isFinite を使います。
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
