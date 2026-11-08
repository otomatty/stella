// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

// 問11 年上の方の名前を返す。同じ年齢なら a の名前
//     例: olderName(ミケ, ポチ) → "ポチ"
export function olderName() {}
