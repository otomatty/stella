// 問13 text と、省略できる min。文字数が min 以上なら true。省略したら 8
//     例: isLongEnough("abcdefgh") → true
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function isLongEnough(text: string, min?: number): boolean {
  return text.length >= (min ?? 8);
}
