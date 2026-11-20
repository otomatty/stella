// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

// 問18 いちばん安いものの name を返す。同じ価格なら先に出てきた方。空の配列なら Error を投げる
//     例: cheapestName([相談, りんご]) → "りんご"
export function cheapestName() {}
