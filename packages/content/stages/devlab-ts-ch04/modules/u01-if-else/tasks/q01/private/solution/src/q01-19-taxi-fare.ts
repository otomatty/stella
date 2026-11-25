// 問19 22時〜翌5時前（22, 23, 0〜4時）は運賃を 2割増しにする（1円未満は四捨五入）。それ以外はそのまま
//     例: taxiFare(1000, 23) → 1200
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function taxiFare(fare: number, hour: number): number {
  if (hour >= 22 || hour < 5) {
    return Math.round(fare * 1.2);
  }
  return fare;
}
