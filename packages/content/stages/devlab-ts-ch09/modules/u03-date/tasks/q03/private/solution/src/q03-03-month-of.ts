// 問3 月を 1〜12 で返す
//     例: monthOf(2026年4月1日) → 4
// 引数と戻り値に型注釈を付けます。
// Date では月を 0〜11（1月が 0）で数えます。
// ローカル時刻の月は getMonth() で取り出します。
// 引数の Date は変更しません。

export function monthOf(date: Date): number {
  return date.getMonth() + 1;
}
