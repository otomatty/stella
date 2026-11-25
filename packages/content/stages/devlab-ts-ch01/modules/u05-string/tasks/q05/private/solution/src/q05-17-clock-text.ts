// 問17 時と分を「09:05」の形にする（どちらも2桁）
//     例: clockText(9, 5) → "09:05"
// 戻り値には型注釈を付けてください。
// padStart が使えます。
export function clockText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
