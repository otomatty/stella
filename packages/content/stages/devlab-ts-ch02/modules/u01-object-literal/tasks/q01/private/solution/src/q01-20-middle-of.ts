// 問20 区間 { start, end } の真ん中の値を返す
//     例: middleOf({ start: 2, end: 8 }) → 5
// 引数と戻り値には型注釈を付けます。
// オブジェクトの型は { name: string; age: number } のように書きます。型に type で名前を付けてもかまいません。
export function middleOf(range: { start: number; end: number }): number {
  return (range.start + range.end) / 2;
}
