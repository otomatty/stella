// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問16
export type Rank = "gold" | "silver" | "bronze";

export function rankPoint(rank: Rank): number {
  if (rank === "gold") {
    return 3;
  }
  if (rank === "silver") {
    return 2;
  }
  return 1;
}
