// 問4 【関数宣言】時と分を、0時からの分にする
//     例: toMinutes(9, 30) → 570
// 引数と戻り値には型注釈を付けてください。
// 用意された関数宣言の形のまま、引数・型・中身を書き足してください。

export function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}
