// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問10
export function rgbText(color: [number, number, number]): string {
  const [r, g, b] = color;
  return `rgb(${r}, ${g}, ${b})`;
}
