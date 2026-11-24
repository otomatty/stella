// 問8 1〜5 をローマ数字 "I"〜"V" にする。それ以外は空の文字列
//     例: romanDigit(4) → "IV"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// どの case にも当てはまらない値は default で扱います。
export function romanDigit(n: number): string {
  switch (n) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    case 5:
      return "V";
    default:
      return "";
  }
}
