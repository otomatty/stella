// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

// 問15
export function orientation(x: { width: number; height: number }): "横長" | "縦長" | "正方形" {
  if (x.width > x.height) {
    return "横長";
  }
  if (x.width < x.height) {
    return "縦長";
  }
  return "正方形";
}
