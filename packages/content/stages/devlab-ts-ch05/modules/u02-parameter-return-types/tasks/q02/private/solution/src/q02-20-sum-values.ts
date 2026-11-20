// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問20
export function sumValues(values: { [key: string]: number }): number {
  let total = 0;
  for (const value of Object.values(values)) {
    total += value;
  }
  return total;
}
