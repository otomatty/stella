// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問17
export type Level = 1 | 2 | 3 | "max";

export function levelValue(level: Level): number {
  return level === "max" ? 10 : level;
}
