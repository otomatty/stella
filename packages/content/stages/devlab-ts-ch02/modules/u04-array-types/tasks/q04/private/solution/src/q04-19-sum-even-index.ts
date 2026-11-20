// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array

// 問19
export function sumEvenIndex(numbers: readonly number[]): number {
  let total = 0;
  numbers.forEach((n, i) => {
    if (i % 2 === 0) {
      total += n;
    }
  });
  return total;
}
