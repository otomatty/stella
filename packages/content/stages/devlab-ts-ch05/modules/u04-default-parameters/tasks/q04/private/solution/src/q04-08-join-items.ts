// 問8 要素を separator でつなぐ。separator を省略したら ", "
//     例: joinItems(["a", "b"]) → "a, b"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function joinItems(items: readonly string[], separator = ", "): string {
  return items.join(separator);
}
