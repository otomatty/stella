// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問16
export function isOrigin(point: [number, number]): boolean {
  const [x, y] = point;
  return x === 0 && y === 0;
}
