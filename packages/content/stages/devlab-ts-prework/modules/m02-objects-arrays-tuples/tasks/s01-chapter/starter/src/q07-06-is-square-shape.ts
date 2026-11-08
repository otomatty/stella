// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

// 問6 width と height が同じなら true
//     例: isSquareShape({ width: 5, height: 5 }) → true
export function isSquareShape() {}
