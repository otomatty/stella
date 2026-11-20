// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問2
export function addAll(target: number[], values: readonly number[]): void {
  for (const value of values) {
    target.push(value);
  }
}
