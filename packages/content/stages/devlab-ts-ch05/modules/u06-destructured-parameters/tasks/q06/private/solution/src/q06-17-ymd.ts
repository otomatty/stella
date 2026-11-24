// 問17 { year, month, day } を「2026-12-04」の形にする（月と日は2桁）
//     例: ymd({ year: 2026, month: 12, day: 4 }) → "2026-12-04"
// 引数と戻り値には型注釈を付けてください。
// オブジェクトは引数の位置で分割代入してください。

export function ymd({ year, month, day }: { year: number; month: number; day: number }): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
