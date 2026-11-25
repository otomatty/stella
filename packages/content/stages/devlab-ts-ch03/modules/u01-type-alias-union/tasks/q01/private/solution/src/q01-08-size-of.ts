// 問8 文字列なら文字数、数値ならその数を返す
//     例: sizeOf("abc") → 3
// 引数と戻り値に型注釈を付ける。
// 引数の型にはユニオン型を直接書く。
// typeof で値の型を確かめて、場合を分ける。

export function sizeOf(value: string | number): number {
  if (typeof value === "string") {
    return value.length;
  }
  return value;
}
