// 問17 配列の配列を、1つの配列にする（for-of を2重にする）
//     例: flatten([[1, 2], [3], []]) → [1, 2, 3]
// 引数と戻り値に型注釈を付けます。
// map や filter などでループを置き換えないでください。
export function flatten(nested: readonly (readonly number[])[]): number[] {
  const result: number[] = [];
  for (const inner of nested) {
    for (const n of inner) {
      result.push(n);
    }
  }
  return result;
}
