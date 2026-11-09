// 05-q01 関数宣言・関数式・アロー関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-declaration
//       https://typescriptbook.jp/reference/functions/function-expression
//       https://typescriptbook.jp/reference/functions/arrow-functions

// 問14
export const lastWord = function (text: string): string {
  return text.slice(text.lastIndexOf(" ") + 1);
};
