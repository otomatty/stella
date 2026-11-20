// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問19
export type FontSize = number | "S" | "M" | "L";

export function fontPx(size: FontSize): number {
  if (size === "S") {
    return 12;
  }
  if (size === "M") {
    return 16;
  }
  if (size === "L") {
    return 20;
  }
  return size;
}
