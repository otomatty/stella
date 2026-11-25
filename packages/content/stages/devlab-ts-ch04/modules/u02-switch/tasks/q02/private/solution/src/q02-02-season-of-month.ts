// 問2 月から季節を返す。3〜5 は "春"、6〜8 は "夏"、9〜11 は "秋"、12〜2 は "冬"。それ以外は Error を投げる
//     例: seasonOfMonth(4) → "春"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// 同じ処理になる case は続けて並べます。
// どの case にも当てはまらない値は default で扱います。
export function seasonOfMonth(month: number): "春" | "夏" | "秋" | "冬" {
  switch (month) {
    case 3:
    case 4:
    case 5:
      return "春";
    case 6:
    case 7:
    case 8:
      return "夏";
    case 9:
    case 10:
    case 11:
      return "秋";
    case 12:
    case 1:
    case 2:
      return "冬";
    default:
      throw new Error("月は1〜12にしてください");
  }
}
