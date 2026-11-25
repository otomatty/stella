// 問20 古い順に並べた新しい配列を返す（元の配列は変えない）
//     例: sortDates([4月3日, 4月1日]) → [4月1日, 4月3日]
// 引数と戻り値に型注釈を付けます。
// 配列の中の Date は変更しません。

export function sortDates(dates: Date[]): Date[] {
  return [...dates].sort((a, b) => a.getTime() - b.getTime());
}
