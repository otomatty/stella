// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問17
export function pickNumbers(values: readonly (string | number)[]): number[] {
  const result: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      result.push(value);
    }
  }
  return result;
}
