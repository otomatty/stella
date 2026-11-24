// 問11 「◯秒後」を返す。seconds を省略したら 1
//     例: afterText() → "1秒後"
// 省略時の値は、引数に times = 2 のように書いてください。
// 戻り値には型注釈を付けてください。

export function afterText(seconds = 1): string {
  return `${seconds}秒後`;
}
