// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 引数や戻り値に Named & Aged のようなインターセクション型を書く。

export type Named = { name: string };

export type Aged = { age: number };

// 問9 age を1増やした、新しい Named & Aged を返す
//     例: olderByOne({ name: "山田", age: 30 }) → { name: "山田", age: 31 }
export function olderByOne() {}
