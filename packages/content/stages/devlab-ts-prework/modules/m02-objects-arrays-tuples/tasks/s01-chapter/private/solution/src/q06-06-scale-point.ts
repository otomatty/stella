// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問6
export function scalePoint(point: [number, number], k: number): [number, number] {
  const [x, y] = point;
  return [x * k, y * k];
}
