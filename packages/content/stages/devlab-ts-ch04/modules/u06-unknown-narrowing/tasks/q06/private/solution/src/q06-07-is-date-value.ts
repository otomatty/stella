// 問7 Date なら true（instanceof を使う）
//     例: isDateValue(new Date()) → true
// 引数と戻り値に型注釈を付けます。
export function isDateValue(value: unknown): boolean {
  return value instanceof Date;
}
