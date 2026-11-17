// 05-q08 関数を返す関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-is-a-value
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問17
export function makeValidator(min: number, max: number): (n: number) => boolean {
  return (n) => n >= min && n <= max;
}
