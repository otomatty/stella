// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 引数や戻り値に Named & Aged のようなインターセクション型を書く。

export type Named = { name: string };

export type Priced = { price: number };

// 問7 name と price から Named & Priced を作る
//     例: makeItem("りんご", 150) → { name: "りんご", price: 150 }
export function makeItem() {}
