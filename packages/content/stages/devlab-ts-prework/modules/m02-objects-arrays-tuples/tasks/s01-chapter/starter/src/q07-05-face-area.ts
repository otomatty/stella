// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

// 問5 width × height を返す。Box でも Paper でも渡せる
//     例: faceArea(A4の紙) → 62370
export function faceArea() {}
