// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Plan = "free" | "pro" | "enterprise";

// 問8
export function planPrice(plan: Plan): number {
  if (plan === "free") {
    return 0;
  }
  if (plan === "pro") {
    return 1000;
  }
  return 5000;
}
