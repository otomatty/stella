// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array

// 問18
export function repeatItem(item: string, times: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < times; i++) {
    result.push(item);
  }
  return result;
}
