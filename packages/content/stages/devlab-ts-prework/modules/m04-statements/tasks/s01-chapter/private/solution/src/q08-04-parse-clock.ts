// 04-q08 文字列の解析 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//       https://typescriptbook.jp/reference/statements/switch

// 問4
export function parseClock(text: string): number {
  const [h = "", m = "", ...rest] = text.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (
    rest.length > 0 ||
    h === "" ||
    m === "" ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`時刻ではありません: ${text}`);
  }
  return hour * 60 + minute;
}
