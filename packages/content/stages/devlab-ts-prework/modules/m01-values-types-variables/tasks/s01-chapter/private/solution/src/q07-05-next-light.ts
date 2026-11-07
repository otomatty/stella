// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問5
export function nextLight(light: "green" | "yellow" | "red"): "green" | "yellow" | "red" {
  if (light === "green") {
    return "yellow";
  }
  if (light === "yellow") {
    return "red";
  }
  return "green";
}
