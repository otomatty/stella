// 05-q01 関数宣言・関数式・アロー関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-declaration
//       https://typescriptbook.jp/reference/functions/function-expression
//       https://typescriptbook.jp/reference/functions/arrow-functions

// 問3
export function initials(first: string, last: string): string {
  return `${first.slice(0, 1)}.${last.slice(0, 1)}.`;
}
