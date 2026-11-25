// 問6 text を left と right で囲む。省略したら "[" と "]"
//     例: bracket("a") → "[a]"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function bracket(text: string, left = "[", right = "]"): string {
  return `${left}${text}${right}`;
}
