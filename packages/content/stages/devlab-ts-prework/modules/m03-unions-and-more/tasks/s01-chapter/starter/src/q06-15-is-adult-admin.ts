// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

export type Aged = { age: number };

// 問15 型 Member を Named & Aged & { role: "admin" | "member" } として定義して export し、isAdultAdmin(member: Member) を書く。role が admin で18歳以上なら true
//     例: isAdultAdmin({ name: "山田", age: 30, role: "admin" }) → true
// ここに型 Member と関数 isAdultAdmin を書く
