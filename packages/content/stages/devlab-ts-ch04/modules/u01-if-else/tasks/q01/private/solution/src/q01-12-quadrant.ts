// 問12 座標 (x, y) が第何象限かを返す。どちらかが 0（軸の上）なら 0
//     例: quadrant(-1, 2) → 2
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function quadrant(x: number, y: number): 0 | 1 | 2 | 3 | 4 {
  if (x === 0 || y === 0) {
    return 0;
  }
  if (x > 0) {
    return y > 0 ? 1 : 4;
  }
  return y > 0 ? 2 : 3;
}
