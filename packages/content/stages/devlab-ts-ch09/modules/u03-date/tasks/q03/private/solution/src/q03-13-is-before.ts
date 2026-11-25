// 問13 a が b より前（時刻まで比べる）なら true。Date どうしは getTime() の数で比べる
//     例: isBefore(4月1日 9:00, 4月1日 10:00) → true
// 引数と戻り値に型注釈を付けます。
// 引数の Date は変更しません。

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}
