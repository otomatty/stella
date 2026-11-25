// 問6 座標 [x, y] を k 倍した座標を返す
//     例: scalePoint([1, 2], 3) → [3, 6]
// 引数と戻り値には型注釈を付けます。
// タプルの要素は配列の分割代入で取り出せます。
export function scalePoint(point: [number, number], k: number): [number, number] {
  const [x, y] = point;
  return [x * k, y * k];
}
