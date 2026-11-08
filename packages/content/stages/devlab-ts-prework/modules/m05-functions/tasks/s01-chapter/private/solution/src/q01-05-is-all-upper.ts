// 05-q01 関数宣言・関数式・アロー関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-declaration
//       https://typescriptbook.jp/reference/functions/function-expression
//       https://typescriptbook.jp/reference/functions/arrow-functions

// 問5
export function isAllUpper(text: string): boolean {
  return text === text.toUpperCase() && text !== text.toLowerCase();
}
