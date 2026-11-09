// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問7
export function typeLabel(value: string | number | boolean): "文字列" | "数値" | "真偽値" {
  if (typeof value === "string") {
    return "文字列";
  }
  if (typeof value === "number") {
    return "数値";
  }
  return "真偽値";
}
