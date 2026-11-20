// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問6
export function toNumberValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }
  return Number(value);
}
