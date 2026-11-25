// 問1 name を返す。引数の型は { name: string }。Cat でも Robot でも渡せる
//     例: nameOf(ミケ) → "ミケ"
// 引数と戻り値には型注釈を付けます。

export type Cat = { name: string; age: number; meow: string };

export type Robot = { name: string; version: number };

export function nameOf() {}
