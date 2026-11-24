// 問11 a と、省略できる b。b があれば平均、なければ a を返す
//     例: averageOf2(4) → 4
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function averageOf2(a: number, b?: number): number {
  return b === undefined ? a : (a + b) / 2;
}
