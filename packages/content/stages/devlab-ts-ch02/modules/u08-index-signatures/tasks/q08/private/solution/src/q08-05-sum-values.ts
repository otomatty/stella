// 問5 値の合計を返す
//     例: sumValues({ a: 1, b: 2 }) → 3
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// 値の一覧を取得するには Object.values を使います。
export function sumValues(record: { [key: string]: number }): number {
  let total = 0;
  for (const value of Object.values(record)) {
    total += value;
  }
  return total;
}
