// 問7 n と、省略できる width。width 桁になるよう前を0で埋める。省略したら 2
//     例: padTwo(5) → "05"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function padTwo(n: number, width?: number): string {
  return String(n).padStart(width ?? 2, "0");
}
