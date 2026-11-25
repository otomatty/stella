// 問13 月（1〜12）が第何四半期かを返す。1〜3月は 1、4〜6月は 2、7〜9月は 3、10〜12月は 4。それ以外は Error を投げる
//     例: quarterOf(5) → 2
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// 同じ処理になる case は続けて並べます。
// どの case にも当てはまらない値は default で扱います。
export function quarterOf(month: number): 1 | 2 | 3 | 4 {
  switch (month) {
    case 1:
    case 2:
    case 3:
      return 1;
    case 4:
    case 5:
    case 6:
      return 2;
    case 7:
    case 8:
    case 9:
      return 3;
    case 10:
    case 11:
    case 12:
      return 4;
    default:
      throw new Error("月は1〜12にしてください");
  }
}
