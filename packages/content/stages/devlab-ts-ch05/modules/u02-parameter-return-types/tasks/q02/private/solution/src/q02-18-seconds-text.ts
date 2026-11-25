// 問18 ミリ秒を「1.5秒」の形にする（小数第1位まで）
//     例: secondsText(1500) → "1.5秒"
// 引数と戻り値には型注釈を付けてください。

export function secondsText(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`;
}
