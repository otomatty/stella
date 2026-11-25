// 問14 「2026-01-01」の形にする（月と日は2桁）。month と day を省略したら 1
//     例: dateText(2026) → "2026-01-01"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function dateText(year: number, month = 1, day = 1): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
