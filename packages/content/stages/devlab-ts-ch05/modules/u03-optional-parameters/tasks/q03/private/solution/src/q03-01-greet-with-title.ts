// 問1 name と、省略できる title。title があれば「山田部長」、なければ「山田さん」
//     例: greetWithTitle("山田") → "山田さん"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function greetWithTitle(name: string, title?: string): string {
  return `${name}${title ?? "さん"}`;
}
