// 問5 char を times 個並べる。char を省略したら "*"、times を省略したら 3
//     例: stars() → "***"
// 省略時の値は、引数に times = 2 のように書いてください。
// 戻り値には型注釈を付けてください。

export function stars(char = "*", times = 3): string {
  return char.repeat(times);
}
