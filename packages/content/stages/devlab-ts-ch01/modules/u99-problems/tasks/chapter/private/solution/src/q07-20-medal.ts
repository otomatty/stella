// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問20
export function medal(rank: number): "金" | "銀" | "銅" | "なし" {
  if (rank === 1) {
    return "金";
  }
  if (rank === 2) {
    return "銀";
  }
  if (rank === 3) {
    return "銅";
  }
  return "なし";
}
