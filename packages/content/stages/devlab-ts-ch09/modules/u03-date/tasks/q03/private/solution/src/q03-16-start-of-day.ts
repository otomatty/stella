// 問16 同じ日の 0時0分0秒0ミリ秒の新しい Date を返す
//     例: startOfDay(4月1日 15:30) → 4月1日 0:00
// 引数と戻り値に型注釈を付けます。
// ローカル時刻の年月日は getFullYear()、getMonth()、getDate() で取り出します。
// 引数の Date は変更しません。

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
