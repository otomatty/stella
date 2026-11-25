// 問11 a を b で割った [商, 余り] を返す（商は小数点以下切り捨て）
//     例: divmod(17, 5) → [3, 2]
// 引数と戻り値には型注釈を付けます。
export function divmod(a: number, b: number): [number, number] {
  return [Math.floor(a / b), a % b];
}
