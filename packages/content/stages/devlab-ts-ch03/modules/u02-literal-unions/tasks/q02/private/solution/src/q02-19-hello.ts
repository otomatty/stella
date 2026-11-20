// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問19
export type Lang = "ja" | "en";

export function hello(lang: Lang): "こんにちは" | "Hello" {
  return lang === "ja" ? "こんにちは" : "Hello";
}
