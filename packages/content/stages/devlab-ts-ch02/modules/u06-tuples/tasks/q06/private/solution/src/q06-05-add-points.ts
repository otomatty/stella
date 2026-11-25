// 問5 2つの座標 [x, y] を足した座標を返す
//     例: addPoints([1, 2], [3, 4]) → [4, 6]
// 引数と戻り値には型注釈を付けます。
// タプルの要素は配列の分割代入で取り出せます。
export function addPoints(a: [number, number], b: [number, number]): [number, number] {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return [x1 + x2, y1 + y2];
}
