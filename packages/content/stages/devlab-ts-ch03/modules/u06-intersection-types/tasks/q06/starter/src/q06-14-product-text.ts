// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

export type Priced = { price: number };

export type Identified = { id: number };

// 問14 型 Product を Named & Priced & Identified として定義して export し、productText(product: Product) を書く。「#1 りんご 150円」
//     例: productText({ id: 1, name: "りんご", price: 150 }) → "#1 りんご 150円"
// ここに型 Product と関数 productText を書く
