// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

// 問7 税込価格（10%。1円未満は切り捨て）を返す。Product でも Service でも渡せる
//     例: priceWithTax(りんご) → 165
export function priceWithTax() {}
