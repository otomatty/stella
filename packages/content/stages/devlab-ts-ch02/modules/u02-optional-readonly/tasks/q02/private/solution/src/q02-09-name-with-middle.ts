// 問9 { first, middle?, last } をつなぐ。middle があれば「first middle last」、なければ「first last」
//     例: nameWithMiddle({ first: "John", middle: "F", last: "Kennedy" }) → "John F Kennedy"
// 引数と戻り値には型注釈を付けます。
// 値が省略されたかどうかは undefined と比較して確かめます。
export function nameWithMiddle(name: { first: string; middle?: string; last: string }): string {
  if (name.middle === undefined) {
    return `${name.first} ${name.last}`;
  }
  return `${name.first} ${name.middle} ${name.last}`;
}
