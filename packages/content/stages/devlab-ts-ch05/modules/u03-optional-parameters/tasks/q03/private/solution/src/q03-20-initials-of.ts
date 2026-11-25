// 問20 first と、省略できる last。「T」、last があれば「T.Y」
//     例: initialsOf("Taro", "Yamada") → "T.Y"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function initialsOf(first: string, last?: string): string {
  const head = first.slice(0, 1);
  return last === undefined ? head : `${head}.${last.slice(0, 1)}`;
}
