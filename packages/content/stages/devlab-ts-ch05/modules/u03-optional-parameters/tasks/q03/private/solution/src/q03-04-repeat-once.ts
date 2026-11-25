// 問4 text と、省略できる times。text を times 回つなぐ。省略したら1回
//     例: repeatOnce("ab") → "ab"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function repeatOnce(text: string, times?: number): string {
  return text.repeat(times ?? 1);
}
