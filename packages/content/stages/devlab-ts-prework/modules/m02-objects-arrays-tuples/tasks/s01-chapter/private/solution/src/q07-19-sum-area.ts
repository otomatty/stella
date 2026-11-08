// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

// 問19
export function sumArea(items: readonly { width: number; height: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.width * item.height;
  }
  return total;
}
