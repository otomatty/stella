// 問19 「キー=値」を「, 」でつないだ文字列にする
//     例: entriesText({ a: 1, b: 2 }) → "a=1, b=2"
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーと値を順に見るには Object.entries を使います。
export function entriesText(record: { [key: string]: number }): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}
