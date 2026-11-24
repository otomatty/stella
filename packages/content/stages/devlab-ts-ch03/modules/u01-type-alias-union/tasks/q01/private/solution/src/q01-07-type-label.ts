// 問7 文字列なら "文字列"、数値なら "数値"、真偽値なら "真偽値" を返す
//     例: typeLabel(true) → "真偽値"
// 引数と戻り値に型注釈を付ける。
// 引数の型にはユニオン型を直接書く。
// typeof で値の型を確かめて、場合を分ける。

export function typeLabel(value: string | number | boolean): "文字列" | "数値" | "真偽値" {
  if (typeof value === "string") {
    return "文字列";
  }
  if (typeof value === "number") {
    return "数値";
  }
  return "真偽値";
}
