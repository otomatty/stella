// 問12 { size, color } を返す。size を省略したら "M"、color を省略したら "black"
//     例: makeOptions() → { size: "M", color: "black" }
// 省略時の値は、引数に times = 2 のように書いてください。
// 戻り値には型注釈を付けてください。

export function makeOptions(size = "M", color = "black"): { size: string; color: string } {
  return { size, color };
}
