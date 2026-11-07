// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問20
export type Temperature = number | "不明";

export function tempText(temp: Temperature): string {
  return temp === "不明" ? temp : `${temp}℃`;
}
