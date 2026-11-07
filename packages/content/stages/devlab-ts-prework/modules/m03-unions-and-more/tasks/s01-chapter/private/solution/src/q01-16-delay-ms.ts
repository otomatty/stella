// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問16
export type Delay = number | "now";

export function delayMs(delay: Delay): number {
  return delay === "now" ? 0 : delay * 1000;
}
