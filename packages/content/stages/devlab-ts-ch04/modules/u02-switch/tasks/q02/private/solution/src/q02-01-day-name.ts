// 問1 0〜6 を "日"〜"土" にする。それ以外は "?"
//     例: dayName(1) → "月"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// どの case にも当てはまらない値は default で扱います。
export function dayName(day: number): string {
  switch (day) {
    case 0:
      return "日";
    case 1:
      return "月";
    case 2:
      return "火";
    case 3:
      return "水";
    case 4:
      return "木";
    case 5:
      return "金";
    case 6:
      return "土";
    default:
      return "?";
  }
}
