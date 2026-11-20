// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern
//
// 引数と戻り値には型注釈を付けること。
// 引数の位置で分割代入して受け取る。例: function area({ width, height }: { width: number; height: number }) { … }
// 「省略したら◯◯」と書いたプロパティは、型では ? を付け、分割代入のところでデフォルト値を書く（{ x = 0 }: { x?: number }）。
// 配列やタプルも分割代入で受け取れる（[first]: readonly string[]）。

// 問2 { width, height } の面積
//     例: areaOf({ width: 3, height: 4 }) → 12
export function areaOf() {}
