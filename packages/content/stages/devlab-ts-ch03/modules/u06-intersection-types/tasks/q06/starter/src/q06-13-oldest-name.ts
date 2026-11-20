// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 引数や戻り値に Named & Aged のようなインターセクション型を書く。

export type Named = { name: string };

export type Aged = { age: number };

// 問13 いちばん年上の人の name を返す。同じ年齢なら先に出てきた人。空の配列なら Error を投げる
//     例: oldestName([山田 30, 佐藤 45]) → "佐藤"
export function oldestName() {}
