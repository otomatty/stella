// 問16 score が pass 以上なら "合格"、それ未満は "不合格"。pass を省略したら 60
//     例: passOrFail(70) → "合格"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function passOrFail(score: number, pass = 60): "合格" | "不合格" {
  return score >= pass ? "合格" : "不合格";
}
