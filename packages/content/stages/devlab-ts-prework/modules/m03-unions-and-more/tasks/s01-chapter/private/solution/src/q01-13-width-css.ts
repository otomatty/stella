// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問13
export type Width = number | "auto";

export function widthCss(width: Width): string {
  return width === "auto" ? width : `${width}px`;
}
