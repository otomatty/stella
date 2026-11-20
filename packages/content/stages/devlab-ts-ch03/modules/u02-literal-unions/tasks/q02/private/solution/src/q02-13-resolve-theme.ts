// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問13
export type Theme = "light" | "dark" | "system";

export function resolveTheme(theme: Theme, osDark: boolean): "light" | "dark" {
  if (theme === "system") {
    return osDark ? "dark" : "light";
  }
  return theme;
}
