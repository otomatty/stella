// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// 引数や戻り値に Named & Aged のようなインターセクション型を書く。

export type Named = { name: string };

export type Timestamped = { createdAt: Date };

// 問4 Named に createdAt を足した Named & Timestamped を返す
//     例: stamp({ name: "メモ" }, 日時) → { name: "メモ", createdAt: 日時 }
export function stamp() {}
