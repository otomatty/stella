// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問18
export function distanceBetween(
  { x: x1, y: y1 }: { x: number; y: number },
  { x: x2, y: y2 }: { x: number; y: number },
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
