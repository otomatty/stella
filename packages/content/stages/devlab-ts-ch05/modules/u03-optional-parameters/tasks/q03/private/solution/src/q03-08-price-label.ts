// 問8 price と、省略できる unit。「1,200円」の形。unit を省略したら「円」
//     例: priceLabel(1200, "ドル") → "1,200ドル"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function priceLabel(price: number, unit?: string): string {
  return `${price.toLocaleString("ja-JP")}${unit ?? "円"}`;
}
