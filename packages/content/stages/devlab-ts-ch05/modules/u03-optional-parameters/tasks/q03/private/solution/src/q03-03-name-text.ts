// 問3 last と、省略できる first。「山田 太郎」、first がなければ「山田」
//     例: nameText("山田") → "山田"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function nameText(last: string, first?: string): string {
  return first === undefined ? last : `${last} ${first}`;
}
