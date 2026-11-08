// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

// 問16 型 Post を Identified & Timestamped & { title: string } として定義して export し、postTitle(post: Post) を書く。「#1 はじめまして」
//     例: postTitle({ id: 1, createdAt: 日時, title: "はじめまして" }) → "#1 はじめまして"
// ここに型 Post と関数 postTitle を書く
