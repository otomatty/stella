// 問20 型 Temperature（数値か "不明"）を定義して export し、tempText(temp: Temperature) を書く。数値なら「25℃」、"不明" ならそのまま
//     例: tempText(25) → "25℃"
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Temperature = number | "不明";

export function tempText(temp: Temperature): string {
  return temp === "不明" ? temp : `${temp}℃`;
}
