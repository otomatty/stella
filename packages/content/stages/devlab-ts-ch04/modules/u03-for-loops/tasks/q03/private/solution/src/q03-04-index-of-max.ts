// 問4 最大値の番号（0から数える）を返す。同じなら先の方。空の配列なら -1
//     例: indexOfMax([3, 9, 2]) → 1
// 引数と戻り値に型注釈を付けます。
// 番号も使うところは for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function indexOfMax(numbers: readonly number[]): number {
  let best = -1;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    const current = numbers[best];
    if (n !== undefined && (current === undefined || n > current)) {
      best = i;
    }
  }
  return best;
}
