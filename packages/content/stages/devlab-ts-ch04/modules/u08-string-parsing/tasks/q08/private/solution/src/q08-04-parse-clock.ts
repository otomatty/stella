// 問4 "09:30" を、0時からの分（570）にする。時が 0〜23、分が 0〜59 の整数でなければ "時刻ではありません: <text>" の Error
//     例: parseClock("09:30") → 570
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
// Number で数値に変換し、Number.isInteger で整数か確かめます。
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
