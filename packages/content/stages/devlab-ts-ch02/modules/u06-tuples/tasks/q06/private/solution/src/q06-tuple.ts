// 問題
// 1. 座標を表す型 Point を、[x, y] の2つの数値を持つタプル型として定義して export してください
//
// 2. distance(a, b) を書いてください。2点間の距離を返す
//    例: distance([0, 0], [3, 4]) → 5
//    ヒント: Math.hypot または Math.sqrt
//
// 3. midpoint(a, b) を書いてください。2点の中点を Point で返す
//    const [x1, y1] = a; のように、配列の分割代入を使うこと
//    例: midpoint([0, 0], [4, 2]) → [2, 1]
//
// 4. minMax(numbers) を書いてください
//    [最小値, 最大値] のタプルを返す。引数は readonly number[]。空の配列なら Error を投げる
//    例: minMax([3, 1, 2]) → [1, 3]
//    戻り値の型注釈を書かないと、どんな型に推論されるかも確かめておくこと

export type Point = [number, number];

export function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function midpoint(a: Point, b: Point): Point {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

// 注釈がないと、戻り値は number[] に推論される
export function minMax(numbers: readonly number[]): [number, number] {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return [Math.min(...numbers), Math.max(...numbers)];
}
