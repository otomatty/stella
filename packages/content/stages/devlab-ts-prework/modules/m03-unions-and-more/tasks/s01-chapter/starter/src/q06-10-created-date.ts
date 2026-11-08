// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 引数や戻り値に Named & Aged のようなインターセクション型を書く。

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

// 問10 createdAt を「2026-12-01」の形にする（toISOString の先頭10文字）
//     例: createdDate({ id: 1, createdAt: 日時 }) → "2026-12-01"
export function createdDate() {}
