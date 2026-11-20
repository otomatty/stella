// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問4
export function pointText({ x = 0, y = 0 }: { x?: number; y?: number }): string {
  return `(${x}, ${y})`;
}
