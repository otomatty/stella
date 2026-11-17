// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

// 問20 型 Place を Named & { lat: number; lng: number } として定義して export し、place(name: string, lat: number, lng: number) を書く。Place を返す
//     例: place("東京駅", 35.68, 139.76) → { name: "東京駅", lat: 35.68, lng: 139.76 }
// ここに型 Place と関数 place を書く
