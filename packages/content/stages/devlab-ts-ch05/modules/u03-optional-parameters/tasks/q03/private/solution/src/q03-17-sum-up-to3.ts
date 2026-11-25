// 問17 a と、省略できる b と c。渡されたものだけを足す
//     例: sumUpTo3(1, 2) → 3
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function sumUpTo3(a: number, b?: number, c?: number): number {
  return a + (b ?? 0) + (c ?? 0);
}
