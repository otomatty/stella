// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問12
export type Answer = "yes" | "no" | "maybe";

export function parseAnswer(text: string): Answer | undefined {
  const value = text.toLowerCase();
  if (value === "yes" || value === "no" || value === "maybe") {
    return value;
  }
  return undefined;
}
