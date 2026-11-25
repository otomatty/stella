// 問18 正の数だけを合計する。0 以下は continue で飛ばす
//     例: sumPositives([3, -1, 0, 5]) → 8
// 引数と戻り値に型注釈を付けます。
export function sumPositives(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    if (n <= 0) {
      continue;
    }
    total += n;
  }
  return total;
}
