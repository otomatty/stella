// 問5 曜日の番号（0が日曜、6が土曜）が土日なら true
//     例: isWeekend(6) → true
// 戻り値には型注釈を付けてください。
// 判定式の結果を return の1行で返せます。
export function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}
