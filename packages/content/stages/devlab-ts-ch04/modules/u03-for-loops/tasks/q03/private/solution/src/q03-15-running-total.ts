// 問15 先頭からの累計を並べた配列を返す
//     例: runningTotal([1, 2, 3]) → [1, 3, 6]
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function runningTotal(numbers: readonly number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const n of numbers) {
    total += n;
    result.push(total);
  }
  return result;
}
