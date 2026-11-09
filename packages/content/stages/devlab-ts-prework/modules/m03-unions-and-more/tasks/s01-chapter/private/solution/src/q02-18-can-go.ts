// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問18
export type Signal = "red" | "yellow" | "green";

export function canGo(signal: Signal): boolean {
  return signal === "green";
}
