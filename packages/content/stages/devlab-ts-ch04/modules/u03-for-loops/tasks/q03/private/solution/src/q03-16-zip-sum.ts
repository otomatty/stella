// 問16 2つの配列の同じ番号どうしを足した配列を返す。長さが違えば短い方に合わせる
//     例: zipSum([1, 2, 3], [10, 20]) → [11, 22]
// 引数と戻り値に型注釈を付けます。
// 番号も使うところは for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function zipSum(a: readonly number[], b: readonly number[]): number[] {
  const result: number[] = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    result.push((a[i] ?? 0) + (b[i] ?? 0));
  }
  return result;
}
