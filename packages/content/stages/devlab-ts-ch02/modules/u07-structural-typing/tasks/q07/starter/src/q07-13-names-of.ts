// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export type Robot = { name: string; version: number };

// 問13 name を並べた配列を返す。Cat、Dog、Robot が混ざった配列も渡せる
//     例: namesOf([ミケ, ポチ, R2]) → ["ミケ", "ポチ", "R2"]
export function namesOf() {}
