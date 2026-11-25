// 問11 最初の文字列の要素を返す。なければ undefined
//     例: firstText([1, "a", "b"]) → "a"
// 引数と戻り値に型注釈を付けます。
// typeof で値の型を確かめます。
export function firstText(values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}
