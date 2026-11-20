// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問5
export function addPoints(a: [number, number], b: [number, number]): [number, number] {
  const [x1, y1] = a;
  const [x2, y2] = b;
  return [x1 + x2, y1 + y2];
}
