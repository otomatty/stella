// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問8
export function sizeOf(value: string | number): number {
  if (typeof value === "string") {
    return value.length;
  }
  return value;
}
