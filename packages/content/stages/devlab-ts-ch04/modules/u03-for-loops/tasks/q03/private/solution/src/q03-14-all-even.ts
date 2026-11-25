// 問14 すべて偶数なら true。奇数が見つかったら、その時点で false を返す
//     例: allEven([2, 4, 5]) → false
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function allEven(numbers: readonly number[]): boolean {
  for (const n of numbers) {
    if (n % 2 !== 0) {
      return false;
    }
  }
  return true;
}
