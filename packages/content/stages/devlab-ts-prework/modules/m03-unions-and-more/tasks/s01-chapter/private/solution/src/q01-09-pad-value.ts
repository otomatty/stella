// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問9
export function padValue(value: string | number, width: number): string {
  return String(value).padStart(width, "0");
}
