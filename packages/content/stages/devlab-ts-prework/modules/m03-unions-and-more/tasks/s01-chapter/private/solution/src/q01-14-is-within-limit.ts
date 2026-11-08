// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問14
export type Limit = number | "無制限";

export function isWithinLimit(value: number, limit: Limit): boolean {
  return limit === "無制限" || value <= limit;
}
