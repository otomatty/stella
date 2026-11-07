// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

// 問18 型 Tagged を Named & { tags: string[] } として定義して export し、addTag(x: Tagged, tag: string) を書く。tags の末尾に tag を足した、新しい Tagged を返す
//     例: addTag({ name: "メモ", tags: ["a"] }, "b") → { name: "メモ", tags: ["a", "b"] }
// ここに型 Tagged と関数 addTag を書く
