// 問16 型 Delay（秒数の数値か "now"）を定義して export し、delayMs(delay: Delay) を書く。ミリ秒にして返す。"now" は 0
//     例: delayMs(1.5) → 1500
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Delay = number | "now";

export function delayMs(delay: Delay): number {
  return delay === "now" ? 0 : delay * 1000;
}
