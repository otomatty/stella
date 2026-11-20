// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問12
export function splitName(fullName: string): [string, string] {
  const [last = "", first = ""] = fullName.split(" ");
  return [last, first];
}
