// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問18
export function methodLabel(method: "GET" | "POST" | "DELETE"): "取得" | "作成" | "削除" {
  if (method === "GET") {
    return "取得";
  }
  if (method === "POST") {
    return "作成";
  }
  return "削除";
}
