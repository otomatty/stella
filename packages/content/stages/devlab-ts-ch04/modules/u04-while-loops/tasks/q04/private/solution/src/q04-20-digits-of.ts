// 問20 0以上の整数の各桁を、上の桁から並べた配列を返す。0 は [0]（do-while で書く）
//     例: digitsOf(305) → [3, 0, 5]
// 引数と戻り値に型注釈を付けます。
export function digitsOf(n: number): number[] {
  const digits: number[] = [];
  let rest = n;
  do {
    digits.unshift(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return digits;
}
