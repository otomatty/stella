// 問14 2つの集計を合わせる。同じキーは値を足す
//     例: mergeCounts({ a: 1, b: 2 }, { b: 3, c: 4 }) → { a: 1, b: 5, c: 4 }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーがない場合の値は ?? で補えます。
// キーと値を順に見るには Object.entries を使います。
// 元のオブジェクトは変えず、新しいオブジェクトにまとめます。
export function mergeCounts(
  a: { [key: string]: number },
  b: { [key: string]: number },
): { [key: string]: number } {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}
