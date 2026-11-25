// 問2 key があれば true
//     例: hasKey({ a: "x" }, "a") → true
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: string } の形で書きます。
// キーから取り出した値が undefined かどうかを確かめます。
export function hasKey(record: { [key: string]: string }, key: string): boolean {
  return record[key] !== undefined;
}
