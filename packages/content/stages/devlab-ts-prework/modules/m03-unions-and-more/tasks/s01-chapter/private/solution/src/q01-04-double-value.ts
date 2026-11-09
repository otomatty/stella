// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問4
export function doubleValue(value: string | number): string | number {
  if (typeof value === "number") {
    return value * 2;
  }
  return value.repeat(2);
}
