// 問13 2つの数を [小さい方, 大きい方] にする
//     例: order2(5, 2) → [2, 5]
// 引数と戻り値には型注釈を付けます。
export function order2(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}
