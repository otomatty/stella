// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

export type Plan = "free" | "pro" | "enterprise";

// 問9
export function upgrade(plan: Plan): Plan {
  if (plan === "free") {
    return "pro";
  }
  return "enterprise";
}
