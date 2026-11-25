// 問7 value を min 以上 max 以下に収める。min を省略したら 0、max を省略したら 100
//     例: limit(150) → 100
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function limit(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}
