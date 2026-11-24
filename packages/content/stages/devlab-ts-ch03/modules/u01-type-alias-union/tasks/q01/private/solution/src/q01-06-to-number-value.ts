// 問6 数値ならそのまま、文字列なら Number で数値にして返す
//     例: toNumberValue("12") → 12
// 引数と戻り値に型注釈を付ける。
// 引数の型にはユニオン型を直接書く。
// typeof で値の型を確かめて、場合を分ける。

export function toNumberValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  return Number(value);
}
