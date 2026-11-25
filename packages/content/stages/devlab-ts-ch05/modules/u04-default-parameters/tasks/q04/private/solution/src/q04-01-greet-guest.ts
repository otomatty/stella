// 問1 省略できる name を受け取り「こんにちは、◯◯さん」を返す。省略したら「ゲスト」
//     例: greetGuest() → "こんにちは、ゲストさん"
// 省略時の値は、引数に times = 2 のように書いてください。
// 戻り値には型注釈を付けてください。

export function greetGuest(name = "ゲスト"): string {
  return `こんにちは、${name}さん`;
}
