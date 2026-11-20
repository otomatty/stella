// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問1
export function toggle(state: "on" | "off"): "on" | "off" {
  return state === "on" ? "off" : "on";
}
