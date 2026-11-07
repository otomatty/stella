// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

// 問14
export function perimeterOf(x: { width: number; height: number }): number {
  return (x.width + x.height) * 2;
}
