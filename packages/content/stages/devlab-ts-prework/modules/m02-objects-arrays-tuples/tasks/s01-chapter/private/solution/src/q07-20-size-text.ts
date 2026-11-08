// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Paper = { width: number; height: number };

// 問20
export function sizeText(x: { width: number; height: number }): string {
  return `${x.width} × ${x.height}`;
}
