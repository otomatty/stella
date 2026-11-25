// 問3 数値なら小数第2位までの文字列（toFixed(2)）、文字列ならそのまま返す
//     例: formatValue(3.14159) → "3.14"
// 引数と戻り値に型注釈を付ける。
// 引数の型にはユニオン型を直接書く。
// typeof で値の型を確かめて、場合を分ける。

export function formatValue(value: string | number): string {
  if (typeof value === "number") {
    return value.toFixed(2);
  }
  return value;
}
