// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Plan = "free" | "pro" | "enterprise";

// 問10
export function parsePlan(text: string): Plan | undefined {
  const value = text.toLowerCase();
  if (value === "free" || value === "pro" || value === "enterprise") {
    return value;
  }
  return undefined;
}
