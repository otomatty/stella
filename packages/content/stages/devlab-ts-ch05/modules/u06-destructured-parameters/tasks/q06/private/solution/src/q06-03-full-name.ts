// 問3 { first, last } を「姓 名」の順でつなぐ
//     例: fullName({ first: "太郎", last: "山田" }) → "山田 太郎"
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。

export function fullName({ first, last }: { first: string; last: string }): string {
  return `${last} ${first}`;
}
