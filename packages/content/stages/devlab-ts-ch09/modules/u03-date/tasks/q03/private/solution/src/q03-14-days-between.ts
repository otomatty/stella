// 問14 a の日付から b の日付までの日数を返す（b が前なら負）。時刻は無視する
//     例: daysBetween(4月1日 23:00, 4月2日 1:00) → 1
// 引数と戻り値に型注釈を付けます。
// ローカル時刻の年月日は getFullYear()、getMonth()、getDate() で取り出します。
// 引数の Date は変更しません。

export function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
