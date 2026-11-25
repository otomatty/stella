// 問7 【関数宣言】曜日の番号（0が日曜、6が土曜）が土日なら true
//     例: isWeekendDay(6) → true
// 引数と戻り値には型注釈を付けてください。
// 用意された関数宣言の形のまま、引数・型・中身を書き足してください。

export function isWeekendDay(day: number): boolean {
  return day === 0 || day === 6;
}
