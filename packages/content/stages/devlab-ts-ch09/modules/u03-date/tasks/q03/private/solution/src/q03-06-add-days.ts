// 問6 n 日後の新しい Date を返す（元の Date は変えない。n は負でもよい）
//     例: addDays(2026年4月30日, 1) → 2026年5月1日
// 引数と戻り値に型注釈を付けます。
// 日時を変更するときは new Date(date.getTime()) でコピーしてから変更します。

export function addDays(date: Date, n: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + n);
  return result;
}
