// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Priced = { price: number };

// 問19 型 Discounted を Priced & { discount: number } として定義して export し、finalPrice(x: Discounted) を書く。price - discount を返す。0 より小さくはしない
//     例: finalPrice({ price: 1000, discount: 200 }) → 800
// ここに型 Discounted と関数 finalPrice を書く
