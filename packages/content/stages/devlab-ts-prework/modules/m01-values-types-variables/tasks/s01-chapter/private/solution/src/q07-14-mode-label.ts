// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問14
export function modeLabel(mode: "light" | "dark"): "ライトモード" | "ダークモード" {
  return mode === "light" ? "ライトモード" : "ダークモード";
}
