// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問19
export function statusColor(status: "online" | "busy" | "offline"): "green" | "red" | "gray" {
  if (status === "online") {
    return "green";
  }
  if (status === "busy") {
    return "red";
  }
  return "gray";
}
