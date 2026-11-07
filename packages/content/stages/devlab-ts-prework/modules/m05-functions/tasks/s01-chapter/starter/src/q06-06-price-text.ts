// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern
//
// 引数と戻り値には型注釈を付けること。
// 引数の位置で分割代入して受け取る。例: function area({ width, height }: { width: number; height: number }) { … }
// 「省略したら◯◯」と書いたプロパティは、型では ? を付け、分割代入のところでデフォルト値を書く（{ x = 0 }: { x?: number }）。
// 配列やタプルも分割代入で受け取れる（[first]: readonly string[]）。

// 問6 { price, currency } を「1,200円」の形にする。currency を省略したら「円」
//     例: priceText({ price: 1200 }) → "1,200円"
export function priceText() {}
