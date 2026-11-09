// 01-q08 any をなくす ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any
//
// この関数は、引数と戻り値が any なので、型のチェックが効いていません。
// すべての any を正しい型に書き換えてください。中には、any のせいで見落とされているバグがあるものもあります。
// 型を直すと見つかるので、あわせて直すこと。文字列を + でつないでいるところは、テンプレートリテラルに書き換える。

// 問9 金額を3桁ごとのカンマ区切りにし、「円」を付ける
//     例: priceText(1200) → "1,200円"
export function priceText(price: any): any {
  return price.toLocalString("ja-JP") + "円";
}
