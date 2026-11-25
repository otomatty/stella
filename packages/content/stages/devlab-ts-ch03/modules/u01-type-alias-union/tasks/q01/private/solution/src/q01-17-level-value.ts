// 問17 型 Level（1、2、3、"max" のどれか）を定義して export し、levelValue(level: Level) を書く。"max" は 10、それ以外はその数
//     例: levelValue("max") → 10
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Level = 1 | 2 | 3 | "max";

export function levelValue(level: Level): number {
  return level === "max" ? 10 : level;
}
