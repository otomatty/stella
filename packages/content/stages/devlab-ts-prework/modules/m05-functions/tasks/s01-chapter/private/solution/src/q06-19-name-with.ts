// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問19
export function nameWith(
  { first, last }: { first: string; last: string },
  separator = " ",
): string {
  return `${last}${separator}${first}`;
}
