// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問17
export function maxOfArray(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.max(...numbers);
}
