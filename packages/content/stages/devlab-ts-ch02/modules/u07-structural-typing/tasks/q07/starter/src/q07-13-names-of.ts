// 問13 name を並べた配列を返す。Cat、Dog、Robot が混ざった配列も渡せる
//     例: namesOf([ミケ, ポチ, R2]) → ["ミケ", "ポチ", "R2"]
// 引数と戻り値には型注釈を付けます。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export type Robot = { name: string; version: number };

export function namesOf() {}
