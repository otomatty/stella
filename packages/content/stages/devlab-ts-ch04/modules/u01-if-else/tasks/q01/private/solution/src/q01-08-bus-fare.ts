// 問8 バスの運賃を返す。6歳未満は 0円、12歳以下は 120円、それ以外は 240円
//     例: busFare(10) → 120
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function busFare(age: number): number {
  if (age < 6) {
    return 0;
  }
  if (age <= 12) {
    return 120;
  }
  return 240;
}
