// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問10
export function userLabel({ name, age }: { name: string; age?: number }): string {
  return `${name}（${age ?? "?"}）`;
}
