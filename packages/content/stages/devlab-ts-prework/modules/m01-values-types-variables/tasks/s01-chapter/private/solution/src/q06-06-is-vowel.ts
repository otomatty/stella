// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問6
export function isVowel(char: string): boolean {
  return char.length === 1 && "aeiou".includes(char.toLowerCase());
}
