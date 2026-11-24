// 問12 name と、省略できる color。「<name>」、color があれば「<name:color>」
//     例: tagText("重要", "red") → "<重要:red>"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function tagText(name: string, color?: string): string {
  return color === undefined ? `<${name}>` : `<${name}:${color}>`;
}
