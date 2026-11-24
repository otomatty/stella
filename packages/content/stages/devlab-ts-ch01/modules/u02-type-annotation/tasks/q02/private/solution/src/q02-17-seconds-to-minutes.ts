// 問17 秒を分に変える（1分未満は切り捨て）
//     例: secondsToMinutes(150) → 2
// 戻り値には型注釈を付けてください。
export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}
