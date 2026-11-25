// 問18 キーの番号 13 は "Enter"、27 は "Escape"、32 は "Space"、それ以外は "Other"
//     例: keyName(13) → "Enter"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// どの case にも当てはまらない値は default で扱います。
export function keyName(code: number): string {
  switch (code) {
    case 13:
      return "Enter";
    case 27:
      return "Escape";
    case 32:
      return "Space";
    default:
      return "Other";
  }
}
