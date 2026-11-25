// 問19 n と、省略できる min と max。min 以上 max 以下なら true。省略したら min は 0、max は 100
//     例: inRange(150) → false
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function inRange(n: number, min?: number, max?: number): boolean {
  return n >= (min ?? 0) && n <= (max ?? 100);
}
