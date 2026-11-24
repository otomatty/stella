// 問3 分を「◯時間◯分」の文字列にする
//     例: minutesToText(125) → "2時間5分"
export function minutesToText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}時間${rest}分`;
}
