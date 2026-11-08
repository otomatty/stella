// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問7
export function distanceFromOrigin(point: [number, number]): number {
  const [x, y] = point;
  return Math.hypot(x, y);
}
