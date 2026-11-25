// 問17 同じ月の最終日の 0時0分の Date を返す（翌月の 0日 は、その月の最終日になる）
//     例: endOfMonth(2026年4月15日) → 2026年4月30日
// 引数と戻り値に型注釈を付けます。
// Date では月を 0〜11（1月が 0）で数えます。
// ローカル時刻の年と月は getFullYear() と getMonth() で取り出します。
// 引数の Date は変更しません。

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
