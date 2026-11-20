// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問2
export function flipPair(pair: [number, string]): [string, number] {
  const [count, name] = pair;
  return [name, count];
}
